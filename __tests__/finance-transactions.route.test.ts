import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Route tests for /api/finance/transactions — PR 3 scaffold.
 * Ownership is session-derived; creates are idempotent by key; soft-missing
 * tables degrade to deferred/empty instead of 500.
 */

type TxRow = Record<string, unknown>;

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  list: [] as TxRow[],
  listError: null as { code?: string; message: string } | null,
  priorIdem: null as {
    resource_id: string;
    response_status: number;
    response_body: unknown;
  } | null,
  idemError: null as { code?: string; message: string } | null,
  insertError: null as { code?: string; message: string } | null,
  inserted: null as TxRow | null,
  insertCalls: [] as TxRow[],
  idemInsertCalls: 0,
}));

function chainableList() {
  const api: Record<string, unknown> = {};
  const self = () => api;
  api.select = self;
  api.eq = self;
  api.is = self;
  api.order = self;
  api.limit = self;
  api.lt = self;
  api.then = undefined;
  // Terminal for await query
  Object.defineProperty(api, "then", {
    get() {
      return (resolve: (v: unknown) => unknown) =>
        resolve({ data: state.list, error: state.listError });
    },
  });
  return api;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === "finance_transactions") {
        return {
          select: () => chainableList(),
          insert: (payload: TxRow) => {
            state.insertCalls.push(payload);
            return {
              select: () => ({
                single: async () => ({
                  data: state.insertError ? null : (state.inserted ?? payload),
                  error: state.insertError,
                }),
              }),
            };
          },
        };
      }
      if (table === "finance_mutation_idempotency") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: state.priorIdem,
                  error: state.idemError,
                }),
              }),
            }),
          }),
          insert: async () => {
            state.idemInsertCalls += 1;
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

vi.mock("@/lib/ratelimit", () => ({
  getClientIp: () => "203.0.113.9",
  rateLimit: async () => ({ allowed: true }),
}));

import { GET, POST } from "@/app/api/finance/transactions/route";

const CAT = "11111111-1111-4111-8111-111111111111";
const TX_ID = "22222222-2222-4222-8222-222222222222";

function validCreate(overrides: Record<string, unknown> = {}) {
  return {
    id: TX_ID,
    idempotencyKey: "idem-key-abcdefghijklmnop",
    type: "expense",
    amountCents: 4200,
    description: "Groceries",
    categoryId: CAT,
    transactionDate: "2026-08-03",
    ...overrides,
  };
}

beforeEach(() => {
  state.user = { id: "user-1" };
  state.list = [];
  state.listError = null;
  state.priorIdem = null;
  state.idemError = null;
  state.insertError = null;
  state.inserted = null;
  state.insertCalls = [];
  state.idemInsertCalls = 0;
});

describe("GET /api/finance/transactions", () => {
  it("401s anonymous callers", async () => {
    state.user = null;
    const res = await GET(new Request("http://localhost/api/finance/transactions"));
    expect(res.status).toBe(401);
  });

  it("returns empty when the migration is not applied", async () => {
    state.listError = { code: "42P01", message: "undefined_table" };
    const res = await GET(new Request("http://localhost/api/finance/transactions"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      transactions: [],
      deferred: true,
    });
  });
});

describe("POST /api/finance/transactions", () => {
  it("401s anonymous callers", async () => {
    state.user = null;
    const res = await POST(
      new Request("http://localhost/api/finance/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validCreate()),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("400s when expense lacks a category", async () => {
    const res = await POST(
      new Request("http://localhost/api/finance/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validCreate({ categoryId: null })),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns the prior body on idempotency hit without re-inserting", async () => {
    state.priorIdem = {
      resource_id: TX_ID,
      response_status: 201,
      response_body: { transaction: { id: TX_ID, description: "prior" } },
    };
    const res = await POST(
      new Request("http://localhost/api/finance/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validCreate()),
      }),
    );
    expect(res.status).toBe(201);
    expect(state.insertCalls).toHaveLength(0);
    await expect(res.json()).resolves.toEqual({
      transaction: { id: TX_ID, description: "prior" },
    });
  });

  it("creates a manual posted row and records idempotency", async () => {
    state.inserted = {
      id: TX_ID,
      user_id: "user-1",
      type: "expense",
      status: "posted",
      amount_cents: 4200,
      currency: "USD",
      description: "Groceries",
      merchant_name: null,
      category_id: CAT,
      account_id: null,
      transaction_date: "2026-08-03",
      posted_at: "2026-08-03T12:00:00.000Z",
      source: "manual",
      external_transaction_id: null,
      recurring_rule_id: null,
      transfer_group_id: null,
      parent_transaction_id: null,
      is_excluded_from_budget: false,
      user_note: null,
      created_at: "2026-08-03T12:00:00.000Z",
      updated_at: "2026-08-03T12:00:00.000Z",
      deleted_at: null,
    };

    const res = await POST(
      new Request("http://localhost/api/finance/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validCreate()),
      }),
    );
    expect(res.status).toBe(201);
    expect(state.insertCalls[0]?.user_id).toBe("user-1");
    expect(state.insertCalls[0]?.source).toBe("manual");
    expect(state.idemInsertCalls).toBe(1);
    const body = await res.json();
    expect(body.transaction.amountCents).toBe(4200);
    expect(body.transaction.userId).toBe("user-1");
  });

  it("defers when the ledger table is missing", async () => {
    state.insertError = { code: "PGRST205", message: "not in schema cache" };
    const res = await POST(
      new Request("http://localhost/api/finance/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validCreate()),
      }),
    );
    expect(res.status).toBe(202);
    await expect(res.json()).resolves.toMatchObject({ deferred: true });
  });
});
