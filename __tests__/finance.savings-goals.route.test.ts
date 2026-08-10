import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Route tests for /api/finance/savings-goals — the finance ledger savings goal
 * CRUD. Ownership is RLS-shaped: user_id always comes from the session, never
 * the body.
 *
 * GET returns a list. PUT still writes a single goal (the multi-goal write path
 * is the client ledger's job today) and keeps `goal` in the response alongside
 * `goals` so clients written against the one-goal shape keep working.
 */

type GoalRow = Record<string, unknown>;

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  goal: null as GoalRow | null,
  selectError: null as { code?: string; message: string } | null,
  updateError: null as { message: string } | null,
  insertError: null as { message: string } | null,
  deleteError: null as { code?: string; message: string } | null,
  updateCalls: [] as { id: string; payload: Record<string, unknown> }[],
  insertCalls: [] as Record<string, unknown>[],
  deleteFilters: [] as [string, unknown][],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table !== "finance_savings_goals") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              // Multi-goal read: .order(...).limit(...) resolves to a list.
              order: () => ({
                limit: async () => ({
                  data: state.goal ? [state.goal] : [],
                  error: state.selectError,
                }),
              }),
              maybeSingle: async () => ({ data: state.goal, error: state.selectError }),
            }),
            maybeSingle: async () => ({ data: state.goal, error: state.selectError }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          state.updateCalls.push({ id: String(state.goal?.id ?? "new-id"), payload });
          return {
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () =>
                    state.updateError
                      ? { data: null, error: state.updateError }
                      : { data: { id: "goal-1", ...payload }, error: null },
                }),
              }),
            }),
          };
        },
        insert: (payload: Record<string, unknown>) => {
          state.insertCalls.push(payload);
          return {
            select: () => ({
              single: async () =>
                state.insertError
                  ? { data: null, error: state.insertError }
                  : { data: { id: "goal-1", ...payload }, error: null },
            }),
          };
        },
        upsert: () => {
          throw new Error("use explicit insert/update, not upsert");
        },
      };
    },
  }),
}));

import { GET, PUT, DELETE } from "@/app/api/finance/savings-goals/route";

let requestCount = 0;

function req(method: string, body?: unknown): Request {
  requestCount += 1;
  return new Request("http://localhost/api/finance/savings-goals", {
    method,
    // Distinct IP per request so the per-IP limiter never trips across tests.
    headers: { "x-forwarded-for": `10.4.0.${requestCount}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  state.user = { id: "user-1" };
  state.goal = null;
  state.selectError = null;
  state.updateError = null;
  state.insertError = null;
  state.deleteError = null;
  state.updateCalls = [];
  state.insertCalls = [];
  state.deleteFilters = [];
});

describe("GET /api/finance/savings-goals", () => {
  it("401s an anonymous request", async () => {
    state.user = null;
    const res = await GET(req("GET"));
    expect(res.status).toBe(401);
  });

  it("returns null when no active goal is set", async () => {
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ goals: [], goal: null });
  });

  it("returns the caller's active goal in cents", async () => {
    state.goal = {
      id: "goal-1",
      user_id: "user-1",
      name: "Down payment",
      goal_type: "home",
      target_amount_cents: 6000000,
      current_amount_cents: 1200000,
      target_date: "2027-06-01",
      planned_monthly_contribution_cents: 0,
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      goal: { targetAmountCents: number; currentAmountCents: number };
    };
    expect(body.goal.targetAmountCents).toBe(6000000);
    expect(body.goal.currentAmountCents).toBe(1200000);
  });

  it("degrades to null while the ledger migration is not applied yet", async () => {
    state.selectError = {
      code: "42P01",
      message: 'relation "finance_savings_goals" does not exist',
    };
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ goals: [], goal: null });
  });

  it("500s with a correlation id on an unexpected database error", async () => {
    state.selectError = { code: "XX000", message: "boom" };
    const res = await GET(req("GET"));
    expect(res.status).toBe(500);
    expect(((await res.json()) as { correlationId?: string }).correlationId).toBeTruthy();
  });
});

describe("PUT /api/finance/savings-goals", () => {
  it("401s an anonymous request", async () => {
    state.user = null;
    const res = await PUT(req("PUT", { name: "Down payment", target_amount: 60000 }));
    expect(res.status).toBe(401);
  });

  it("400s on a non-JSON body", async () => {
    requestCount += 1;
    const res = await PUT(
      new Request("http://localhost/api/finance/savings-goals", {
        method: "PUT",
        headers: { "x-forwarded-for": `10.4.1.${requestCount}` },
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects zero, negative, and missing target amounts", async () => {
    for (const body of [
      {},
      { target_amount: 0 },
      { target_amount: -5 },
      { target_amount: "60000" },
      { name: "", target_amount: 60000 },
    ]) {
      const res = await PUT(req("PUT", body));
      expect(res.status).toBe(400);
    }
    expect(state.insertCalls).toHaveLength(0);
    expect(state.updateCalls).toHaveLength(0);
  });

  it("inserts a new active goal when none exists", async () => {
    const res = await PUT(req("PUT", { name: "20% down", target_amount: 60000 }));
    expect(res.status).toBe(200);
    expect(state.insertCalls).toHaveLength(1);
    expect(state.updateCalls).toHaveLength(0);
    const call = state.insertCalls[0];
    expect(call).toMatchObject({
      user_id: "user-1",
      name: "20% down",
      goal_type: "home",
      target_amount_cents: 6000000,
      current_amount_cents: 0,
      target_date: null,
      planned_monthly_contribution_cents: 0,
      status: "active",
    });
    expect(call).not.toHaveProperty("user_id", "attacker-1");
    const body = (await res.json()) as { goal: { targetAmountCents: number } };
    expect(body.goal.targetAmountCents).toBe(6000000);
  });

  it("updates the existing active goal instead of inserting a second one", async () => {
    state.goal = { id: "existing-goal" };
    const res = await PUT(req("PUT", { name: "Updated", target_amount: 80000 }));
    expect(res.status).toBe(200);
    expect(state.insertCalls).toHaveLength(0);
    expect(state.updateCalls).toHaveLength(1);
    const call = state.updateCalls[0];
    expect(call.id).toBe("existing-goal");
    expect(call.payload).toMatchObject({
      user_id: "user-1",
      name: "Updated",
      target_amount_cents: 8000000,
      status: "active",
    });
    const body = (await res.json()) as { goal: { targetAmountCents: number } };
    expect(body.goal.targetAmountCents).toBe(8000000);
  });

  it("converts optional dollars fields to cents", async () => {
    const res = await PUT(
      req("PUT", {
        name: "Down payment",
        target_amount: 50000,
        target_date: "2027-01-01",
        current_amount: 1234.56,
        planned_monthly_contribution: 1000,
      }),
    );
    expect(res.status).toBe(200);
    const call = state.insertCalls[0];
    expect(call.target_amount_cents).toBe(5000000);
    expect(call.current_amount_cents).toBe(123456);
    expect(call.planned_monthly_contribution_cents).toBe(100000);
    expect(call.target_date).toBe("2027-01-01");
  });

  it("500s with a correlation id when the upsert fails", async () => {
    state.insertError = { message: "boom" };
    const res = await PUT(req("PUT", { name: "Down payment", target_amount: 60000 }));
    expect(res.status).toBe(500);
    expect(((await res.json()) as { correlationId?: string }).correlationId).toBeTruthy();
  });
});

describe("DELETE /api/finance/savings-goals", () => {
  it("401s an anonymous request", async () => {
    state.user = null;
    const res = await DELETE(req("DELETE"));
    expect(res.status).toBe(401);
  });

  it("archives the caller's active goal", async () => {
    const res = await DELETE(req("DELETE"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("stays idempotent while the ledger migration is not applied yet", async () => {
    state.deleteError = {
      code: "42P01",
      message: 'relation "finance_savings_goals" does not exist',
    };
    const res = await DELETE(req("DELETE"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
