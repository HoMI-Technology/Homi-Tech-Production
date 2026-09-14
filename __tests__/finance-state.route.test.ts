import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Route tests for /api/finance-state — the LEGACY manual finance snapshot.
 * Phase-3 kill (docs/ops/MONEY-LEDGER-MIGRATION.md): the route is read-only.
 * GET keeps the old contract for the transition window (the one-time
 * legacy → ledger import still reads it); PUT is retired and answers 410,
 * so no client — first-party or stale — can write user_finance_state.
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

describe("PUT /api/finance-state (retired at the Phase-3 kill)", () => {
  it("answers 410 and never touches the table", async () => {
    const res = await PUT(putRequest({ state: VALID_STATE, client_updated_at: 200 }));
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.replacedBy).toBe("/api/finance/transactions");
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("answers 410 even for anonymous or malformed callers", async () => {
    state.user = null;
    const res = await PUT(putRequest({ state: { monthlyIncome: "lots" } }));
    expect(res.status).toBe(410);
    expect(state.upsertCalls).toHaveLength(0);
  });
});
