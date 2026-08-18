import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHash, generateKeyPairSync, sign as signBytes } from "node:crypto";
import { clearWebhookKeyCache } from "@/lib/plaid/webhook-verify";

/**
 * Route tests for POST /api/plaid/webhook.
 *
 * JWT verification is exercised with REAL crafted ES256 JWTs (keypair
 * generated per suite, JWK served through a mocked /webhook_verification_key/get)
 * for the rejection paths that matter: missing header, alg != ES256, raw-body
 * sha256 mismatch, stale iat — plus one fully verified happy path. Dispatch
 * and dedupe tests use the non-production PLAID_WEBHOOK_SKIP_VERIFY hatch.
 */

const state = vi.hoisted(() => ({
  eventIds: new Set<string>(),
  eventInsertError: null as { code: string; message: string } | null,
  item: null as Record<string, unknown> | null,
  itemUpdates: [] as Record<string, unknown>[],
  accountDeletes: [] as string[],
  transactionDeletes: [] as string[],
  transactionDeleteError: null as { message: string } | null,
  syncCalls: [] as Record<string, unknown>[],
  adminAvailable: true,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    if (!state.adminAvailable) return null;
    return {
      from: (table: string) => {
        if (table === "webhook_events") {
          return {
            insert: async (row: { event_id: string }) => {
              if (state.eventInsertError) return { error: state.eventInsertError };
              if (state.eventIds.has(row.event_id)) {
                return { error: { code: "23505", message: "duplicate key" } };
              }
              state.eventIds.add(row.event_id);
              return { error: null };
            },
          };
        }
        if (table === "plaid_items") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: state.item, error: null }),
              }),
            }),
            update: (patch: Record<string, unknown>) => ({
              eq: async () => {
                state.itemUpdates.push(patch);
                return { error: null };
              },
            }),
          };
        }
        if (table === "plaid_accounts") {
          return {
            delete: () => ({
              eq: async (_col: string, id: string) => {
                state.accountDeletes.push(id);
                return { error: null };
              },
            }),
          };
        }
        if (table === "plaid_transactions") {
          return {
            delete: () => ({
              eq: async (_col: string, id: string) => {
                state.transactionDeletes.push(id);
                return { error: state.transactionDeleteError };
              },
            }),
          };
        }
        if (table.startsWith("plaid_")) {
          return {
            delete: () => ({
              eq: async () => ({ error: null }),
            }),
            select: () => ({
              eq: async () => ({ data: [], error: null }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    };
  },
}));

vi.mock("@/lib/plaid/sync", () => ({
  syncItem: vi.fn(async (_admin: unknown, item: Record<string, unknown>) => {
    state.syncCalls.push(item);
    return { added: 0, modified: 0, removed: 0, accountsUpdated: 0, snapshotInserted: false };
  }),
  PlaidSyncError: class PlaidSyncError extends Error {},
}));

vi.mock("@/lib/plaid/picture", () => ({
  syncItemPictureFromDb: vi.fn(async () => ({
    identityAccounts: 0,
    holdings: 0,
    investmentTransactions: 0,
    liabilities: 0,
  })),
  syncItemPicture: vi.fn(async () => ({
    identityAccounts: 0,
    holdings: 0,
    investmentTransactions: 0,
    liabilities: 0,
  })),
}));

import { POST } from "@/app/api/plaid/webhook/route";

/* ─── crafted-JWT plumbing ──────────────────────────────────────────────── */

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const KID = "test-kid-1";
const JWK = {
  ...(publicKey.export({ format: "jwk" }) as Record<string, unknown>),
  kid: KID,
  alg: "ES256",
  use: "sig",
};

function b64url(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function sha256Hex(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** Builds a REAL ES256-signed Plaid-Verification JWT. */
function craftJwt(
  rawBody: string,
  overrides: { header?: Record<string, unknown>; payload?: Record<string, unknown> } = {},
): string {
  const header = { alg: "ES256", typ: "JWT", kid: KID, ...overrides.header };
  const payload = {
    iat: Math.floor(Date.now() / 1000),
    request_body_sha256: sha256Hex(rawBody),
    ...overrides.payload,
  };
  const input = `${b64url(header)}.${b64url(payload)}`;
  const signature = signBytes("sha256", Buffer.from(input, "utf8"), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `${input}.${signature.toString("base64url")}`;
}

/** Serves the JWK from the mocked /webhook_verification_key/get endpoint. */
function stubKeyEndpoint() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/webhook_verification_key/get")) {
        return new Response(JSON.stringify({ key: JWK }), { status: 200 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch,
  );
}

function webhookRequest(rawBody: string, jwt?: string): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (jwt) headers["plaid-verification"] = jwt;
  return new Request("http://localhost/api/plaid/webhook", {
    method: "POST",
    headers,
    body: rawBody,
  });
}

const ITEM_ROW = {
  id: "item-row-uuid-1",
  user_id: "user-1",
  item_id: "item-plaid-abc",
  access_token_ct: "v1:x:y",
  transactions_cursor: null,
  status: "healthy",
};

function body(
  webhookType: string,
  webhookCode: string,
  extra: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    webhook_type: webhookType,
    webhook_code: webhookCode,
    item_id: "item-plaid-abc",
    ...extra,
  });
}

beforeEach(() => {
  state.eventIds = new Set();
  state.eventInsertError = null;
  state.item = { ...ITEM_ROW };
  state.itemUpdates = [];
  state.accountDeletes = [];
  state.transactionDeletes = [];
  state.transactionDeleteError = null;
  state.syncCalls = [];
  state.adminAvailable = true;
  clearWebhookKeyCache();
  vi.stubEnv("PLAID_CLIENT_ID", "client_test");
  vi.stubEnv("PLAID_SECRET", "secret_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/* ─── verification ──────────────────────────────────────────────────────── */

describe("POST /api/plaid/webhook — JWT verification", () => {
  it("401s a delivery with no Plaid-Verification header", async () => {
    const res = await POST(webhookRequest(body("ITEM", "LOGIN_REPAIRED")));
    expect(res.status).toBe(401);
    expect(state.itemUpdates).toHaveLength(0);
  });

  it("401s a JWT whose alg is not ES256 (even with a matching body hash)", async () => {
    stubKeyEndpoint();
    const raw = body("ITEM", "LOGIN_REPAIRED");
    const jwt = craftJwt(raw, { header: { alg: "HS256" } });
    const res = await POST(webhookRequest(raw, jwt));
    expect(res.status).toBe(401);
    expect(state.itemUpdates).toHaveLength(0);
  });

  it("401s a validly signed JWT whose request_body_sha256 does not match the raw body", async () => {
    stubKeyEndpoint();
    const raw = body("ITEM", "LOGIN_REPAIRED");
    const jwt = craftJwt(raw, { payload: { request_body_sha256: sha256Hex("tampered body") } });
    const res = await POST(webhookRequest(raw, jwt));
    expect(res.status).toBe(401);
    expect(state.itemUpdates).toHaveLength(0);
  });

  it("401s a validly signed JWT older than 5 minutes (replay)", async () => {
    stubKeyEndpoint();
    const raw = body("ITEM", "LOGIN_REPAIRED");
    const jwt = craftJwt(raw, { payload: { iat: Math.floor(Date.now() / 1000) - 6 * 60 } });
    const res = await POST(webhookRequest(raw, jwt));
    expect(res.status).toBe(401);
  });

  it("processes a delivery carrying a genuine ES256 JWT with a matching body hash", async () => {
    stubKeyEndpoint();
    const raw = body("ITEM", "LOGIN_REPAIRED");
    const res = await POST(webhookRequest(raw, craftJwt(raw)));
    expect(res.status).toBe(200);
    expect(state.itemUpdates).toEqual([{ status: "healthy" }]);
  });

  it("ignores the skip-verify hatch in production", async () => {
    vi.stubEnv("PLAID_WEBHOOK_SKIP_VERIFY", "true");
    vi.stubEnv("NODE_ENV", "production");
    const res = await POST(webhookRequest(body("ITEM", "LOGIN_REPAIRED")));
    expect(res.status).toBe(401);
  });
});

/* ─── dispatch + dedupe (skip-verify hatch, non-production only) ─────────── */

describe("POST /api/plaid/webhook — dispatch", () => {
  beforeEach(() => {
    vi.stubEnv("PLAID_WEBHOOK_SKIP_VERIFY", "true");
  });

  it("acknowledges a duplicate delivery without reprocessing (processed:false)", async () => {
    const raw = body("ITEM", "PENDING_EXPIRATION");
    const first = await POST(webhookRequest(raw));
    expect(first.status).toBe(200);
    expect(state.itemUpdates).toEqual([{ status: "pending_expiration" }]);

    const second = await POST(webhookRequest(raw));
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as { processed?: boolean };
    expect(secondBody.processed).toBe(false);
    // No second status write happened.
    expect(state.itemUpdates).toHaveLength(1);
  });

  it("runs the shared sync for TRANSACTIONS/SYNC_UPDATES_AVAILABLE", async () => {
    const res = await POST(webhookRequest(body("TRANSACTIONS", "SYNC_UPDATES_AVAILABLE")));
    expect(res.status).toBe(200);
    expect(state.syncCalls).toHaveLength(1);
    expect(state.syncCalls[0].item_id).toBe("item-plaid-abc");
  });

  it("marks login_required on ITEM/ERROR with ITEM_LOGIN_REQUIRED", async () => {
    const raw = body("ITEM", "ERROR", { error: { error_code: "ITEM_LOGIN_REQUIRED" } });
    const res = await POST(webhookRequest(raw));
    expect(res.status).toBe(200);
    expect(state.itemUpdates).toEqual([{ status: "login_required" }]);
  });

  it("marks pending_disconnect on ITEM/PENDING_DISCONNECT", async () => {
    const res = await POST(webhookRequest(body("ITEM", "PENDING_DISCONNECT")));
    expect(res.status).toBe(200);
    expect(state.itemUpdates).toEqual([{ status: "pending_disconnect" }]);
  });

  it("marks revoked AND purges the item's accounts and transactions on USER_PERMISSION_REVOKED", async () => {
    const res = await POST(webhookRequest(body("ITEM", "USER_PERMISSION_REVOKED")));
    expect(res.status).toBe(200);
    expect(state.itemUpdates).toEqual([{ status: "revoked" }]);
    expect(state.accountDeletes).toEqual(["item-row-uuid-1"]);
    expect(state.transactionDeletes).toEqual(["item-row-uuid-1"]);
  });

  it("also treats USER_ACCOUNT_REVOKED as a full revocation purge", async () => {
    const res = await POST(webhookRequest(body("ITEM", "USER_ACCOUNT_REVOKED")));
    expect(res.status).toBe(200);
    expect(state.itemUpdates).toEqual([{ status: "revoked" }]);
    expect(state.accountDeletes).toEqual(["item-row-uuid-1"]);
    expect(state.transactionDeletes).toEqual(["item-row-uuid-1"]);
  });

  // Transactions are purged BEFORE accounts so a partial failure cannot leave
  // the more sensitive rows behind after their only UI entry point is gone.
  // The webhook must still ack, so Plaid redelivers and the retry completes.
  it("still purges accounts and acks when the transaction purge fails", async () => {
    state.transactionDeleteError = { message: "transient failure" };
    const res = await POST(webhookRequest(body("ITEM", "USER_PERMISSION_REVOKED")));
    expect(res.status).toBe(200);
    expect(state.transactionDeletes).toEqual(["item-row-uuid-1"]);
    expect(state.accountDeletes).toEqual(["item-row-uuid-1"]);
  });

  it("200s WEBHOOK_UPDATE_ACKNOWLEDGED as a no-op", async () => {
    const res = await POST(webhookRequest(body("ITEM", "WEBHOOK_UPDATE_ACKNOWLEDGED")));
    expect(res.status).toBe(200);
    expect(state.itemUpdates).toHaveLength(0);
    expect(state.syncCalls).toHaveLength(0);
  });

  it("200s (never 4xx/5xx) an unknown webhook type", async () => {
    const res = await POST(webhookRequest(body("HOLDINGS", "DEFAULT_UPDATE")));
    expect(res.status).toBe(200);
    expect(state.itemUpdates).toHaveLength(0);
  });

  it("200s a webhook for an item_id we do not know", async () => {
    state.item = null;
    const res = await POST(webhookRequest(body("TRANSACTIONS", "SYNC_UPDATES_AVAILABLE")));
    expect(res.status).toBe(200);
    expect(state.syncCalls).toHaveLength(0);
  });

  it("500s when the dedupe ledger cannot record the event (so Plaid retries)", async () => {
    state.eventInsertError = { code: "XX000", message: "db down" };
    const res = await POST(webhookRequest(body("ITEM", "LOGIN_REPAIRED")));
    expect(res.status).toBe(500);
    expect(state.itemUpdates).toHaveLength(0);
  });

  it("still 200s when the shared sync throws (work retried on next delivery)", async () => {
    const { syncItem } = await import("@/lib/plaid/sync");
    (syncItem as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("plaid down"),
    );
    const res = await POST(webhookRequest(body("TRANSACTIONS", "SYNC_UPDATES_AVAILABLE")));
    expect(res.status).toBe(200);
    const resBody = (await res.json()) as { processed?: boolean };
    expect(resBody.processed).toBe(false);
  });
});
