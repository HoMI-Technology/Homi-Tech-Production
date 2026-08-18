import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { decryptToken } from "@/lib/plaid/crypto";

vi.mock("@/lib/plaid/picture", () => ({
  syncItemPicture: vi.fn(async () => ({
    identityAccounts: 0,
    holdings: 0,
    investmentTransactions: 0,
    liabilities: 0,
  })),
  syncItemPictureFromDb: vi.fn(async () => ({
    identityAccounts: 0,
    holdings: 0,
    investmentTransactions: 0,
    liabilities: 0,
  })),
}));

/**
 * Route tests for POST /api/plaid/exchange — proves the access_token is no
 * longer discarded: it is persisted to plaid_items as AES-256-GCM ciphertext
 * (never the raw token) via the service-role client, together with the
 * item's accounts, and the response reports what was actually stored.
 */

const RAW_TOKEN = "access-sandbox-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const KEY = randomBytes(32).toString("base64");

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  tier: "plus" as string,
  itemUpserts: [] as Record<string, unknown>[],
  accountUpserts: [] as Record<string, unknown>[][],
  auditInserts: [] as Record<string, unknown>[],
  adminAvailable: true,
  /** user_id already holding the incoming item_id, if any (409 guard). */
  existingItemOwner: null as string | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === "audit_log") {
        return {
          insert: async (row: Record<string, unknown>) => {
            state.auditInserts.push(row);
            return { error: null };
          },
        };
      }
      // profiles (entitlements lookup)
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data: state.user ? { subscription_tier: state.tier } : null,
        }),
      };
      return builder;
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    if (!state.adminAvailable) return null;
    return {
      from: (table: string) => {
        if (table === "plaid_items") {
          const builder = {
            upsert: (row: Record<string, unknown>) => {
              state.itemUpserts.push(row);
              return builder;
            },
            select: () => builder,
            eq: () => builder,
            maybeSingle: async () => ({
              data: state.existingItemOwner ? { user_id: state.existingItemOwner } : null,
              error: null,
            }),
            single: async () => ({ data: { id: "item-row-uuid-1" }, error: null }),
          };
          return builder;
        }
        // plaid_accounts
        return {
          upsert: async (rows: Record<string, unknown>[]) => {
            state.accountUpserts.push(rows);
            return { error: null };
          },
        };
      },
    };
  },
}));

import { POST } from "@/app/api/plaid/exchange/route";

let requestCount = 0;

function req(body: unknown): Request {
  requestCount += 1;
  return new Request("http://localhost/api/plaid/exchange", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Distinct IP per request so the per-IP limiter never trips across tests.
      "x-forwarded-for": `10.2.0.${requestCount}`,
    },
    body: JSON.stringify(body),
  });
}

function plaidResponses(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/item/public_token/exchange")) {
      return new Response(JSON.stringify({ access_token: RAW_TOKEN, item_id: "item-plaid-abc" }), {
        status: 200,
      });
    }
    if (url.endsWith("/item/get")) {
      return new Response(
        JSON.stringify({ item: { institution_id: "ins_1", institution_name: "First Test Bank" } }),
        { status: 200 },
      );
    }
    if (url.endsWith("/accounts/get")) {
      return new Response(
        JSON.stringify({
          accounts: [
            {
              account_id: "acc_1",
              name: "Everyday Checking",
              mask: "1234",
              type: "depository",
              subtype: "checking",
              balances: { current: 1500.25, available: 1400.5, iso_currency_code: "USD" },
            },
          ],
        }),
        { status: 200 },
      );
    }
    throw new Error(`unexpected Plaid call: ${url}`);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  state.user = { id: "user-plus-1" };
  state.tier = "plus";
  state.itemUpserts = [];
  state.accountUpserts = [];
  state.auditInserts = [];
  state.adminAvailable = true;
  state.existingItemOwner = null;
  vi.stubEnv("PLAID_CLIENT_ID", "client_test");
  vi.stubEnv("PLAID_SECRET", "secret_test");
  vi.stubEnv("PLAID_TOKEN_KEY", KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/plaid/exchange", () => {
  it("reports configured:false (200) when Plaid env is absent", async () => {
    vi.stubEnv("PLAID_CLIENT_ID", "");
    vi.stubEnv("PLAID_SECRET", "");
    const res = await POST(req({ public_token: "public-x" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ configured: false });
  });

  it("401s an anonymous request", async () => {
    state.user = null;
    const res = await POST(req({ public_token: "public-x" }));
    expect(res.status).toBe(401);
    expect(state.itemUpserts).toHaveLength(0);
  });

  it("402s an authenticated free-tier user", async () => {
    state.tier = "free";
    const res = await POST(req({ public_token: "public-x" }));
    expect(res.status).toBe(402);
    expect(state.itemUpserts).toHaveLength(0);
  });

  it("400s an invalid body", async () => {
    vi.stubGlobal("fetch", plaidResponses());
    expect((await POST(req({}))).status).toBe(400);
    expect((await POST(req({ public_token: "" }))).status).toBe(400);
    expect(state.itemUpserts).toHaveLength(0);
  });

  it("persists the encrypted token (never the raw one) plus accounts, and reports them", async () => {
    vi.stubGlobal("fetch", plaidResponses());

    const res = await POST(req({ public_token: "public-sandbox-1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      item_id: "item-plaid-abc",
      institution_name: "First Test Bank",
      accounts_count: 1,
    });

    // plaid_items upsert: ciphertext stored, raw token nowhere.
    expect(state.itemUpserts).toHaveLength(1);
    const item = state.itemUpserts[0];
    expect(item.user_id).toBe("user-plus-1");
    expect(item.item_id).toBe("item-plaid-abc");
    expect(item.institution_id).toBe("ins_1");
    expect(item.institution_name).toBe("First Test Bank");
    expect(item.status).toBe("healthy");
    expect(item.key_version).toBe(1);
    const stored = item.access_token_ct as string;
    expect(stored).not.toBe(RAW_TOKEN);
    expect(stored).not.toContain(RAW_TOKEN);
    expect(decryptToken(stored)).toBe(RAW_TOKEN);

    // plaid_accounts upsert keyed to the plaid_items row id.
    expect(state.accountUpserts).toHaveLength(1);
    expect(state.accountUpserts[0]).toEqual([
      {
        item_id: "item-row-uuid-1",
        account_id: "acc_1",
        name: "Everyday Checking",
        mask: "1234",
        type: "depository",
        subtype: "checking",
        current_balance: 1500.25,
        available_balance: 1400.5,
        iso_currency: "USD",
      },
    ]);

    // Audit trail recorded (metadata only — no token).
    expect(state.auditInserts).toHaveLength(1);
    expect(JSON.stringify(state.auditInserts[0])).not.toContain(RAW_TOKEN);
  });

  it("409s (with correlation id) when the item_id already belongs to a different user — no silent ownership transfer", async () => {
    state.existingItemOwner = "user-somebody-else";
    vi.stubGlobal("fetch", plaidResponses());

    const res = await POST(req({ public_token: "public-sandbox-1" }));
    expect(res.status).toBe(409);
    const body = (await res.json()) as { correlationId?: string };
    expect(body.correlationId).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain(RAW_TOKEN);
    expect(state.itemUpserts).toHaveLength(0);
    expect(state.accountUpserts).toHaveLength(0);
  });

  it("still upserts when the item_id already belongs to the SAME user (relink)", async () => {
    state.existingItemOwner = "user-plus-1";
    vi.stubGlobal("fetch", plaidResponses());

    const res = await POST(req({ public_token: "public-sandbox-1" }));
    expect(res.status).toBe(200);
    expect(state.itemUpserts).toHaveLength(1);
  });

  it("503s (with correlation id) when the service-role client is unavailable, without leaking the token", async () => {
    state.adminAvailable = false;
    vi.stubGlobal("fetch", plaidResponses());
    const res = await POST(req({ public_token: "public-sandbox-1" }));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { correlationId?: string };
    expect(body.correlationId).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain(RAW_TOKEN);
  });

  it("503s when PLAID_TOKEN_KEY is missing instead of storing a plaintext token", async () => {
    vi.stubEnv("PLAID_TOKEN_KEY", "");
    vi.stubGlobal("fetch", plaidResponses());
    const res = await POST(req({ public_token: "public-sandbox-1" }));
    expect(res.status).toBe(503);
    expect(state.itemUpserts).toHaveLength(0);
  });

  it("502s with a correlation id when the exchange call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("INVALID_PUBLIC_TOKEN", { status: 400 })),
    );
    const res = await POST(req({ public_token: "public-bad" }));
    expect(res.status).toBe(502);
    expect(state.itemUpserts).toHaveLength(0);
  });
});
