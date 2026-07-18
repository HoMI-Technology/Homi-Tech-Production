import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Route tests for /api/finance-state — the server side of the T2.6 local-first
 * sync contract. Ownership is RLS-shaped (user_id always from the session) and
 * writes are last-write-wins: a PUT carrying an older client stamp than the
 * stored row is answered `stale` with the newer copy instead of clobbering it.
 */

type Row = { state: unknown; client_updated_at: string | number } | null;

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  row: null as Row,
  selectError: null as { code?: string; message: string } | null,
  upsertError: null as { code?: string; message: string } | null,
  upsertCalls: [] as { payload: Record<string, unknown>; options: Record<string, unknown> }[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table !== "user_finance_state") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: state.row, error: state.selectError }),
          }),
        }),
        upsert: (payload: Record<string, unknown>, options: Record<string, unknown>) => {
          state.upsertCalls.push({ payload, options });
          return Promise.resolve({ error: state.upsertError });
        },
      };
    },
  }),
}));

vi.mock("@/lib/ratelimit", () => ({
  getClientIp: () => "203.0.113.7",
  rateLimit: async () => ({ allowed: true }),
}));

import { GET, PUT } from "@/app/api/finance-state/route";

const VALID_STATE = {
  monthlyIncome: 6500,
  monthlyExpenses: 4200,
  liquidSavings: 18000,
  totalDebt: 22000,
  monthlyDebtPayments: 650,
  expenseCategories: [{ id: "cat-rent", name: "Rent", amount: 1800 }],
  downPaymentTarget: 60000,
  monteCarloYears: 5,
  expectedReturnPct: 5,
  volatilityPct: 8,
  assets: [{ id: "a", name: "Cash", amount: 18000 }],
  liabilities: [{ id: "l", name: "Cards", amount: 22000 }],
};

function getRequest() {
  return new Request("http://localhost/api/finance-state");
}

function putRequest(body: unknown) {
  return new Request("http://localhost/api/finance-state", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  state.user = { id: "user-1" };
  state.row = null;
  state.selectError = null;
  state.upsertError = null;
  state.upsertCalls = [];
});

describe("GET /api/finance-state", () => {
  it("401s anonymous callers", async () => {
    state.user = null;
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("returns null state when nothing is stored", async () => {
    const res = await GET(getRequest());
    expect(await res.json()).toEqual({ state: null });
  });

  it("returns the row with the bigint stamp coerced to a number", async () => {
    state.row = { state: VALID_STATE, client_updated_at: "1720000000000" };
    const res = await GET(getRequest());
    const body = await res.json();
    expect(body.state).toEqual(VALID_STATE);
    expect(body.client_updated_at).toBe(1720000000000);
  });

  it("reports honestly empty when the table is not migrated yet", async () => {
    state.selectError = { code: "42P01", message: "relation does not exist" };
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ state: null });
  });
});

describe("PUT /api/finance-state", () => {
  it("401s anonymous callers", async () => {
    state.user = null;
    const res = await PUT(putRequest({ state: VALID_STATE, client_updated_at: 100 }));
    expect(res.status).toBe(401);
  });

  it("400s malformed state", async () => {
    const res = await PUT(
      putRequest({ state: { ...VALID_STATE, monthlyIncome: "lots" }, client_updated_at: 100 }),
    );
    expect(res.status).toBe(400);
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("accepts a newer stamp, upserting under the session's user_id", async () => {
    state.row = { state: { old: true }, client_updated_at: "100" };
    const res = await PUT(putRequest({ state: VALID_STATE, client_updated_at: 200 }));
    expect(await res.json()).toEqual({ ok: true });
    expect(state.upsertCalls).toHaveLength(1);
    expect(state.upsertCalls[0].payload.user_id).toBe("user-1");
    expect(state.upsertCalls[0].payload.client_updated_at).toBe(200);
    expect(state.upsertCalls[0].options).toEqual({ onConflict: "user_id" });
  });

  it("answers stale with the newer copy instead of clobbering it", async () => {
    state.row = { state: VALID_STATE, client_updated_at: "900" };
    const res = await PUT(putRequest({ state: { ...VALID_STATE, monthlyIncome: 1 }, client_updated_at: 200 }));
    const body = await res.json();
    expect(body.stale).toBe(true);
    expect(body.state).toEqual(VALID_STATE);
    expect(body.client_updated_at).toBe(900);
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("defers gracefully when the table is not migrated yet", async () => {
    state.upsertError = { code: "PGRST205", message: "table not found" };
    const res = await PUT(putRequest({ state: VALID_STATE, client_updated_at: 200 }));
    expect(await res.json()).toEqual({ ok: true, deferred: true });
  });

  it("never trusts a user_id from the body", async () => {
    const res = await PUT(
      putRequest({ state: VALID_STATE, client_updated_at: 200, user_id: "victim-2" }),
    );
    expect(res.status).toBe(200);
    expect(state.upsertCalls[0].payload.user_id).toBe("user-1");
  });
});
