import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Route tests for /api/finance/savings-goals. Ownership is RLS-shaped: user_id
 * always comes from the session, never the body.
 *
 * The cases that matter most here are the multi-goal ones. #184 dropped the
 * unique index that guaranteed one active goal per user, and this route was
 * written assuming it: PUT resolved "the" goal with .maybeSingle() and inserted
 * a duplicate when that errored, and DELETE archived every active row. Both are
 * pinned below so neither can come back.
 */

type GoalRow = Record<string, unknown>;

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  goals: [] as GoalRow[],
  selectError: null as { code?: string; message: string } | null,
  updateError: null as { message: string } | null,
  insertError: null as { code?: string; message: string } | null,
  updateReturnsNoRow: false,
  updateCalls: [] as { filters: [string, unknown][]; payload: Record<string, unknown> }[],
  insertCalls: [] as Record<string, unknown>[],
}));

/**
 * A chainable stand-in for the PostgREST builder. eq/order collect and return
 * self; limit resolves to the filtered list; single/maybeSingle resolve one
 * row; and it is thenable so a bare `await update().eq().eq()` works the way
 * DELETE uses it.
 */
function makeBuilder(kind: "select" | "update", payload?: Record<string, unknown>) {
  const filters: [string, unknown][] = [];

  const matching = (): GoalRow[] =>
    state.goals.filter((row) => filters.every(([col, val]) => row[col] === val));

  const listResult = () => ({
    data: state.selectError ? null : matching(),
    error: state.selectError,
  });

  const writeResult = () => {
    if (state.updateError) return { data: null, error: state.updateError };
    if (state.updateReturnsNoRow) return { data: null, error: { message: "no rows" } };
    const id = (filters.find(([c]) => c === "id")?.[1] as string) ?? "goal-1";
    return { data: { id, ...payload }, error: null };
  };

  const builder = {
    eq(col: string, val: unknown) {
      filters.push([col, val]);
      if (kind === "update") {
        const call = state.updateCalls[state.updateCalls.length - 1];
        if (call) call.filters = filters;
      }
      return builder;
    },
    order() {
      return builder;
    },
    limit: async () => listResult(),
    select() {
      return builder;
    },
    single: async () => (kind === "select" ? listResult() : writeResult()),
    maybeSingle: async () => ({
      data: state.selectError ? null : (matching()[0] ?? null),
      error: state.selectError,
    }),
    // DELETE awaits the update chain directly.
    then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
      return Promise.resolve({ error: state.updateError ?? state.selectError ?? null }).then(
        resolve,
        reject,
      );
    },
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table !== "finance_savings_goals") throw new Error(`unexpected table ${table}`);
      return {
        select: () => makeBuilder("select"),
        update: (payload: Record<string, unknown>) => {
          state.updateCalls.push({ filters: [], payload });
          return makeBuilder("update", payload);
        },
        insert: (payload: Record<string, unknown>) => {
          state.insertCalls.push(payload);
          return {
            select: () => ({
              single: async () =>
                state.insertError
                  ? { data: null, error: state.insertError }
                  : { data: { id: "goal-new", ...payload }, error: null },
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

function req(method: string, body?: unknown, query = ""): Request {
  requestCount += 1;
  return new Request(`http://localhost/api/finance/savings-goals${query}`, {
    method,
    // Distinct IP per request so the per-IP limiter never trips across tests.
    headers: { "x-forwarded-for": `10.4.0.${requestCount}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function goalRow(over: GoalRow = {}): GoalRow {
  return {
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
    ...over,
  };
}

beforeEach(() => {
  state.user = { id: "user-1" };
  state.goals = [];
  state.selectError = null;
  state.updateError = null;
  state.insertError = null;
  state.updateReturnsNoRow = false;
  state.updateCalls = [];
  state.insertCalls = [];
});

describe("GET /api/finance/savings-goals", () => {
  it("401s an anonymous request", async () => {
    state.user = null;
    expect((await GET(req("GET"))).status).toBe(401);
  });

  it("returns an empty list when no active goal is set", async () => {
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ goals: [], goal: null });
  });

  it("returns the caller's active goals in cents", async () => {
    state.goals = [goalRow()];
    const res = await GET(req("GET"));
    const body = (await res.json()) as {
      goals: unknown[];
      goal: { targetAmountCents: number; currentAmountCents: number };
    };
    expect(body.goals).toHaveLength(1);
    expect(body.goal.targetAmountCents).toBe(6000000);
    expect(body.goal.currentAmountCents).toBe(1200000);
  });

  it("returns every active goal, not just the first", async () => {
    state.goals = [goalRow(), goalRow({ id: "goal-2", goal_type: "emergency_reserve" })];
    const res = await GET(req("GET"));
    expect(((await res.json()) as { goals: unknown[] }).goals).toHaveLength(2);
  });

  it("degrades to empty while the ledger migration is not applied yet", async () => {
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
      expect((await PUT(req("PUT", body))).status).toBe(400);
    }
    expect(state.insertCalls).toHaveLength(0);
    expect(state.updateCalls).toHaveLength(0);
  });

  it("rejects a goal_type outside the database constraint", async () => {
    const res = await PUT(req("PUT", { name: "x", target_amount: 100, goal_type: "yacht" }));
    expect(res.status).toBe(400);
    expect(state.insertCalls).toHaveLength(0);
  });

  it("inserts a new active goal when none exists", async () => {
    const res = await PUT(req("PUT", { name: "20% down", target_amount: 60000 }));
    expect(res.status).toBe(200);
    expect(state.insertCalls).toHaveLength(1);
    expect(state.updateCalls).toHaveLength(0);
    expect(state.insertCalls[0]).toMatchObject({
      user_id: "user-1",
      name: "20% down",
      goal_type: "home",
      target_amount_cents: 6000000,
      status: "active",
    });
    const body = (await res.json()) as { goal: { targetAmountCents: number } };
    expect(body.goal.targetAmountCents).toBe(6000000);
  });

  it("updates the existing active goal instead of inserting a second one", async () => {
    state.goals = [goalRow({ id: "existing-goal" })];
    const res = await PUT(req("PUT", { name: "Updated", target_amount: 80000 }));
    expect(res.status).toBe(200);
    expect(state.insertCalls).toHaveLength(0);
    expect(state.updateCalls).toHaveLength(1);
    expect(state.updateCalls[0]?.payload).toMatchObject({
      user_id: "user-1",
      name: "Updated",
      target_amount_cents: 8000000,
      status: "active",
    });
  });

  /**
   * The regression #184 opened: .maybeSingle() errors on two rows, the error
   * was destructured away, and the route inserted a third goal every save.
   */
  it("updates rather than duplicating when the user already holds two goals", async () => {
    state.goals = [goalRow({ id: "goal-a" }), goalRow({ id: "goal-b" })];
    const res = await PUT(req("PUT", { name: "Updated", target_amount: 70000 }));
    expect(res.status).toBe(200);
    expect(state.insertCalls).toHaveLength(0);
    expect(state.updateCalls).toHaveLength(1);
  });

  it("writes the goal the caller names", async () => {
    state.goals = [goalRow({ id: "goal-a" }), goalRow({ id: "goal-b" })];
    const res = await PUT(
      req("PUT", {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Named",
        target_amount: 90000,
      }),
    );
    expect(res.status).toBe(200);
    const filters = state.updateCalls[0]?.filters ?? [];
    expect(filters).toContainEqual(["id", "22222222-2222-4222-8222-222222222222"]);
    expect(filters).toContainEqual(["user_id", "user-1"]);
  });

  /**
   * A client-chosen id that the caller has no row for is a create under that
   * id — the sync layer needs the id it picked to survive the round trip.
   */
  it("creates under a named id the caller does not have yet", async () => {
    state.updateReturnsNoRow = true;
    const res = await PUT(
      req("PUT", {
        id: "33333333-3333-4333-8333-333333333333",
        name: "New goal",
        target_amount: 1000,
      }),
    );
    expect(res.status).toBe(200);
    expect(state.insertCalls).toHaveLength(1);
    expect(state.insertCalls[0]).toMatchObject({
      id: "33333333-3333-4333-8333-333333333333",
      user_id: "user-1",
    });
  });

  /** An id that belongs to someone else must fail loudly, not report success. */
  it("409s when the named id is already taken", async () => {
    state.updateReturnsNoRow = true;
    state.insertError = { code: "23505", message: "duplicate key" };
    const res = await PUT(
      req("PUT", {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Theirs",
        target_amount: 1000,
      }),
    );
    expect(res.status).toBe(409);
  });

  /** The unnamed path still must not insert when a goal of that type exists. */
  it("never inserts on a failed update when no id was named", async () => {
    state.goals = [goalRow({ id: "existing" })];
    state.updateReturnsNoRow = true;
    const res = await PUT(req("PUT", { name: "Updated", target_amount: 1000 }));
    expect(res.status).toBe(500);
    expect(state.insertCalls).toHaveLength(0);
  });

  /**
   * The core separation: saving a down payment must never reach the emergency
   * reserve, and vice versa.
   */
  it("creates a reserve alongside a home goal rather than overwriting it", async () => {
    state.goals = [goalRow({ id: "home-goal", goal_type: "home" })];
    const res = await PUT(
      req("PUT", {
        name: "Emergency reserve",
        goal_type: "emergency_reserve",
        target_amount: 9000,
      }),
    );
    expect(res.status).toBe(200);
    expect(state.updateCalls).toHaveLength(0);
    expect(state.insertCalls[0]).toMatchObject({ goal_type: "emergency_reserve" });
  });

  it("converts optional dollars fields to cents", async () => {
    await PUT(
      req("PUT", {
        name: "Down payment",
        target_amount: 50000,
        target_date: "2027-01-01",
        current_amount: 1234.56,
        planned_monthly_contribution: 1000,
      }),
    );
    const call = state.insertCalls[0];
    expect(call?.target_amount_cents).toBe(5000000);
    expect(call?.current_amount_cents).toBe(123456);
    expect(call?.planned_monthly_contribution_cents).toBe(100000);
    expect(call?.target_date).toBe("2027-01-01");
  });

  it("500s with a correlation id when the insert fails", async () => {
    state.insertError = { message: "boom" };
    const res = await PUT(req("PUT", { name: "Down payment", target_amount: 60000 }));
    expect(res.status).toBe(500);
    expect(((await res.json()) as { correlationId?: string }).correlationId).toBeTruthy();
  });
});

describe("DELETE /api/finance/savings-goals", () => {
  it("401s an anonymous request", async () => {
    state.user = null;
    expect((await DELETE(req("DELETE"))).status).toBe(401);
  });

  it("archives only the goal named in the query", async () => {
    state.goals = [goalRow({ id: "goal-a" }), goalRow({ id: "goal-b" })];
    const res = await DELETE(req("DELETE", undefined, "?id=goal-b"));
    expect(res.status).toBe(200);
    expect(state.updateCalls).toHaveLength(1);
    expect(state.updateCalls[0]?.payload).toMatchObject({ status: "archived" });
    expect(state.updateCalls[0]?.filters).toContainEqual(["id", "goal-b"]);
  });

  /**
   * The data-loss shape: the old DELETE filtered on user_id + status only, so
   * removing a down-payment goal archived the emergency reserve too. Every
   * archive must be scoped to a single id.
   */
  it("archives one row, never the whole active set", async () => {
    state.goals = [
      goalRow({ id: "home-goal", goal_type: "home" }),
      goalRow({ id: "reserve-goal", goal_type: "emergency_reserve" }),
    ];
    const res = await DELETE(req("DELETE"));
    expect(res.status).toBe(200);
    expect(state.updateCalls).toHaveLength(1);
    const filters = state.updateCalls[0]?.filters ?? [];
    expect(filters.some(([col]) => col === "id")).toBe(true);
    expect(filters).toContainEqual(["id", "home-goal"]);
  });

  it("scopes the untyped fallback to the requested goal type", async () => {
    state.goals = [
      goalRow({ id: "home-goal", goal_type: "home" }),
      goalRow({ id: "reserve-goal", goal_type: "emergency_reserve" }),
    ];
    await DELETE(req("DELETE", undefined, "?goal_type=emergency_reserve"));
    expect(state.updateCalls[0]?.filters).toContainEqual(["id", "reserve-goal"]);
  });

  it("is a no-op when there is nothing to archive", async () => {
    const res = await DELETE(req("DELETE"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(state.updateCalls).toHaveLength(0);
  });

  it("stays idempotent while the ledger migration is not applied yet", async () => {
    state.selectError = {
      code: "42P01",
      message: 'relation "finance_savings_goals" does not exist',
    };
    const res = await DELETE(req("DELETE"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
