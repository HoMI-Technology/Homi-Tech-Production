import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Route tests for POST /api/plaid/sync — manual "Sync now": auth + bankSync
 * gate, per-user "too soon" limiting, ownership scoping (only the caller's
 * items are read), optional {item_id} narrowing, revoked items skipped.
 */

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  tier: "plus" as string,
  items: [] as Record<string, unknown>[],
  syncCalls: [] as Record<string, unknown>[],
  syncShouldThrow: false,
  adminAvailable: true,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => {
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
        if (table !== "plaid_items") throw new Error(`unexpected table ${table}`);
        const filters: [string, unknown][] = [];
        const builder = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            filters.push([col, val]);
            return builder;
          },
          then: (resolve: (v: unknown) => void) => {
            const rows = state.items.filter((row) =>
              filters.every(([col, val]) => row[col] === val),
            );
            resolve({ data: rows, error: null });
          },
        };
        return builder;
      },
    };
  },
}));

vi.mock("@/lib/plaid/sync", () => ({
  syncItem: vi.fn(async (_admin: unknown, item: Record<string, unknown>) => {
    if (state.syncShouldThrow) throw new Error("sync exploded");
    state.syncCalls.push(item);
    return { added: 1, modified: 0, removed: 0, accountsUpdated: 1, snapshotInserted: true };
  }),
  PlaidSyncError: class PlaidSyncError extends Error {},
}));

import { POST } from "@/app/api/plaid/sync/route";

const ITEM_A = "11111111-1111-4111-8111-111111111111";
const ITEM_B = "22222222-2222-4222-8222-222222222222";
const FOREIGN = "33333333-3333-4333-8333-333333333333";

let requestCount = 0;
function req(body?: unknown): Request {
  requestCount += 1;
  return new Request("http://localhost/api/plaid/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.4.0.${requestCount}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

let userCounter = 0;

function makeItems(userId: string) {
  return [
    {
      id: ITEM_A,
      user_id: userId,
      item_id: "plaid-a",
      access_token_ct: "ct",
      transactions_cursor: null,
      status: "healthy",
    },
    {
      id: ITEM_B,
      user_id: userId,
      item_id: "plaid-b",
      access_token_ct: "ct",
      transactions_cursor: "c",
      status: "healthy",
    },
    {
      id: FOREIGN,
      user_id: "someone-else",
      item_id: "plaid-x",
      access_token_ct: "ct",
      transactions_cursor: null,
      status: "healthy",
    },
  ];
}

beforeEach(() => {
  // Unique user per test so the per-user "too soon" limiter never leaks
  // across tests (the limiter is module-global by design).
  userCounter += 1;
  const userId = `user-sync-${userCounter}`;
  state.user = { id: userId };
  state.tier = "plus";
  state.items = makeItems(userId);
  state.syncCalls = [];
  state.syncShouldThrow = false;
  state.adminAvailable = true;
  vi.stubEnv("PLAID_CLIENT_ID", "client_test");
  vi.stubEnv("PLAID_SECRET", "secret_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/plaid/sync", () => {
  it("reports configured:false (200) when Plaid env is absent", async () => {
    vi.stubEnv("PLAID_CLIENT_ID", "");
    vi.stubEnv("PLAID_SECRET", "");
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ configured: false });
  });

  it("401s an anonymous request", async () => {
    state.user = null;
    expect((await POST(req())).status).toBe(401);
  });

  it("402s an authenticated free-tier user", async () => {
    state.tier = "free";
    expect((await POST(req())).status).toBe(402);
  });

  it("syncs every item owned by the caller (and none owned by others)", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; results: { item_id: string; ok: boolean }[] };
    expect(body.ok).toBe(true);
    expect(body.results.map((r) => r.item_id).sort()).toEqual([ITEM_A, ITEM_B]);
    expect(state.syncCalls).toHaveLength(2);
  });

  it("narrows to one item via {item_id}", async () => {
    const res = await POST(req({ item_id: ITEM_B }));
    expect(res.status).toBe(200);
    expect(state.syncCalls).toHaveLength(1);
    expect(state.syncCalls[0].id).toBe(ITEM_B);
  });

  it("404s an item_id owned by a different user", async () => {
    const res = await POST(req({ item_id: FOREIGN }));
    expect(res.status).toBe(404);
    expect(state.syncCalls).toHaveLength(0);
  });

  it("skips revoked items with a reconnect hint instead of calling Plaid", async () => {
    state.items = state.items.map((item) =>
      item.id === ITEM_A ? { ...item, status: "revoked" } : item,
    );
    const res = await POST(req());
    const body = (await res.json()) as {
      ok: boolean;
      results: { item_id: string; ok: boolean; error?: string }[];
    };
    expect(body.ok).toBe(false);
    const revoked = body.results.find((r) => r.item_id === ITEM_A);
    expect(revoked?.ok).toBe(false);
    expect(revoked?.error).toMatch(/reconnect/i);
    expect(state.syncCalls.map((c) => c.id)).toEqual([ITEM_B]);
  });

  it("reports a per-item failure with a correlation id but still 200s", async () => {
    state.syncShouldThrow = true;
    const res = await POST(req({ item_id: ITEM_A }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      results: { ok: boolean; correlationId?: string }[];
    };
    expect(body.ok).toBe(false);
    expect(body.results[0].correlationId).toBeTruthy();
  });

  it("429s a 4th manual sync inside the per-user window (too soon)", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await POST(req())).status).toBe(200);
    }
    const res = await POST(req());
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/recently/i);
  });
});
