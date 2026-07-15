import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomBytes } from "node:crypto";

/**
 * Route tests for POST /api/plaid/disconnect — the compliance delete-my-bank-
 * data flow: ownership enforced, Plaid /item/remove best-effort (a Plaid
 * failure must NOT block the local purge), plaid_items row deleted, audit
 * logged.
 */

const KEY = randomBytes(32).toString("base64");
const RAW_TOKEN = "access-sandbox-dddddddd-eeee-ffff-0000-111111111111";

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  itemRow: null as Record<string, unknown> | null,
  deletes: [] as string[],
  auditInserts: [] as Record<string, unknown>[],
  adminAvailable: true,
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
      throw new Error(`unexpected user-client table ${table}`);
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    if (!state.adminAvailable) return null;
    return {
      from: (table: string) => {
        if (table === "plaid_items") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: state.itemRow, error: null }),
                }),
              }),
            }),
            delete: () => ({
              eq: async (_col: string, id: string) => {
                state.deletes.push(id);
                return { error: null };
              },
            }),
          };
        }
        throw new Error(`unexpected admin table ${table}`);
      },
    };
  },
}));

let encryptToken: (t: string) => string;
let POST: typeof import("@/app/api/plaid/disconnect/route").POST;

const ITEM_UUID = "0f8fad5b-d9cb-469f-a165-70867728950e";

let requestCount = 0;
function req(body: unknown): Request {
  requestCount += 1;
  return new Request("http://localhost/api/plaid/disconnect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.3.0.${requestCount}`,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  vi.stubEnv("PLAID_CLIENT_ID", "client_test");
  vi.stubEnv("PLAID_SECRET", "secret_test");
  vi.stubEnv("PLAID_TOKEN_KEY", KEY);
  ({ encryptToken } = await import("@/lib/plaid/crypto"));
  ({ POST } = await import("@/app/api/plaid/disconnect/route"));

  state.user = { id: "user-1" };
  state.itemRow = {
    id: ITEM_UUID,
    user_id: "user-1",
    item_id: "item-plaid-abc",
    access_token_ct: encryptToken(RAW_TOKEN),
    institution_id: "ins_1",
    institution_name: "First Test Bank",
  };
  state.deletes = [];
  state.auditInserts = [];
  state.adminAvailable = true;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/plaid/disconnect", () => {
  it("401s an anonymous request", async () => {
    state.user = null;
    const res = await POST(req({ item_id: ITEM_UUID }));
    expect(res.status).toBe(401);
    expect(state.deletes).toHaveLength(0);
  });

  it("400s a body without a uuid item_id", async () => {
    expect((await POST(req({}))).status).toBe(400);
    expect((await POST(req({ item_id: "not-a-uuid" }))).status).toBe(400);
    expect(state.deletes).toHaveLength(0);
  });

  it("404s when the item does not belong to the caller (ownership)", async () => {
    // The admin query filters by id AND user_id — a foreign item yields null.
    state.itemRow = null;
    const res = await POST(req({ item_id: ITEM_UUID }));
    expect(res.status).toBe(404);
    expect(state.deletes).toHaveLength(0);
    expect(state.auditInserts).toHaveLength(0);
  });

  it("calls Plaid /item/remove, deletes the row, and audit-logs the disconnect", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("/item/remove");
      const body = JSON.parse(String(init?.body)) as { access_token?: string };
      expect(body.access_token).toBe(RAW_TOKEN);
      return new Response(JSON.stringify({ removed: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const res = await POST(req({ item_id: ITEM_UUID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(state.deletes).toEqual([ITEM_UUID]);

    expect(state.auditInserts).toHaveLength(1);
    expect(state.auditInserts[0].action_type).toBe("plaid_disconnect");
    expect(JSON.stringify(state.auditInserts[0])).not.toContain(RAW_TOKEN);
  });

  it("still purges locally (200) when Plaid /item/remove fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("plaid exploded", { status: 500 })),
    );
    const res = await POST(req({ item_id: ITEM_UUID }));
    expect(res.status).toBe(200);
    expect(state.deletes).toEqual([ITEM_UUID]);
    expect(state.auditInserts).toHaveLength(1);
  });

  it("still purges locally (200) when Plaid is unreachable entirely", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const res = await POST(req({ item_id: ITEM_UUID }));
    expect(res.status).toBe(200);
    expect(state.deletes).toEqual([ITEM_UUID]);
  });

  it("503s with a correlation id when the service-role client is unavailable", async () => {
    state.adminAvailable = false;
    const res = await POST(req({ item_id: ITEM_UUID }));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { correlationId?: string };
    expect(body.correlationId).toBeTruthy();
  });
});
