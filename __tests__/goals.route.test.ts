import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Route tests for /api/goals — the down-payment goal CRUD. Ownership is
 * RLS-shaped: user_id always comes from the session (never the body) and the
 * upsert conflicts on (user_id, kind) so each user holds exactly one goal
 * per kind.
 */

type GoalRow = Record<string, unknown>;

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  goal: null as GoalRow | null,
  selectError: null as { code?: string; message: string } | null,
  upsertError: null as { message: string } | null,
  deleteError: null as { code?: string; message: string } | null,
  upsertCalls: [] as { payload: Record<string, unknown>; options: Record<string, unknown> }[],
  deleteFilters: [] as [string, unknown][],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table !== "goals") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.goal, error: state.selectError }),
            }),
          }),
        }),
        upsert: (payload: Record<string, unknown>, options: Record<string, unknown>) => {
          state.upsertCalls.push({ payload, options });
          return {
            select: () => ({
              single: async () =>
                state.upsertError
                  ? { data: null, error: state.upsertError }
                  : { data: { id: "goal-1", ...payload }, error: null },
            }),
          };
        },
        delete: () => ({
          eq: (col: string, val: unknown) => {
            state.deleteFilters.push([col, val]);
            return {
              eq: (col2: string, val2: unknown) => {
                state.deleteFilters.push([col2, val2]);
                return Promise.resolve({ error: state.deleteError });
              },
            };
          },
        }),
      };
    },
  }),
}));

import { GET, PUT, DELETE } from "@/app/api/goals/route";

let requestCount = 0;

function req(method: string, body?: unknown): Request {
  requestCount += 1;
  return new Request("http://localhost/api/goals", {
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
  state.upsertError = null;
  state.deleteError = null;
  state.upsertCalls = [];
  state.deleteFilters = [];
});

describe("GET /api/goals", () => {
  it("401s an anonymous request", async () => {
    state.user = null;
    const res = await GET(req("GET"));
    expect(res.status).toBe(401);
  });

  it("returns null when no goal is set", async () => {
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ goal: null });
  });

  it("returns the caller's goal", async () => {
    state.goal = { id: "goal-1", kind: "down_payment", target_amount: 60000 };
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { goal: GoalRow }).goal.target_amount).toBe(60000);
  });

  it("degrades to null while migration 00018 is not applied yet", async () => {
    state.selectError = { code: "42P01", message: 'relation "goals" does not exist' };
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ goal: null });
  });

  it("500s with a correlation id on an unexpected database error", async () => {
    state.selectError = { code: "XX000", message: "boom" };
    const res = await GET(req("GET"));
    expect(res.status).toBe(500);
    expect(((await res.json()) as { correlationId?: string }).correlationId).toBeTruthy();
  });
});

describe("PUT /api/goals", () => {
  it("401s an anonymous request", async () => {
    state.user = null;
    const res = await PUT(req("PUT", { target_amount: 60000 }));
    expect(res.status).toBe(401);
  });

  it("400s on a non-JSON body", async () => {
    requestCount += 1;
    const res = await PUT(
      new Request("http://localhost/api/goals", {
        method: "PUT",
        headers: { "x-forwarded-for": `10.4.1.${requestCount}` },
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects zero, negative, and missing target amounts", async () => {
    for (const body of [{}, { target_amount: 0 }, { target_amount: -5 }, { target_amount: "60000" }]) {
      const res = await PUT(req("PUT", body));
      expect(res.status).toBe(400);
    }
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("upserts on (user_id, kind) with the session user — never the body's user_id", async () => {
    const res = await PUT(
      req("PUT", { target_amount: 60000, label: "20% down", user_id: "attacker-1" }),
    );
    expect(res.status).toBe(200);
    expect(state.upsertCalls).toHaveLength(1);
    const call = state.upsertCalls[0];
    expect(call.payload).toEqual({
      user_id: "user-1",
      kind: "down_payment",
      label: "20% down",
      target_amount: 60000,
      target_date: null,
    });
    expect(call.options).toEqual({ onConflict: "user_id,kind" });
    expect(((await res.json()) as { goal: GoalRow }).goal.target_amount).toBe(60000);
  });

  it("replaces rather than duplicates: a second PUT keeps the same conflict target", async () => {
    await PUT(req("PUT", { target_amount: 60000 }));
    await PUT(req("PUT", { target_amount: 80000 }));
    expect(state.upsertCalls).toHaveLength(2);
    expect(state.upsertCalls.every((c) => c.options.onConflict === "user_id,kind")).toBe(true);
    expect(state.upsertCalls[1].payload.target_amount).toBe(80000);
  });

  it("500s with a correlation id when the upsert fails", async () => {
    state.upsertError = { message: "boom" };
    const res = await PUT(req("PUT", { target_amount: 60000 }));
    expect(res.status).toBe(500);
    expect(((await res.json()) as { correlationId?: string }).correlationId).toBeTruthy();
  });
});

describe("DELETE /api/goals", () => {
  it("401s an anonymous request", async () => {
    state.user = null;
    const res = await DELETE(req("DELETE"));
    expect(res.status).toBe(401);
  });

  it("deletes scoped to the session user's down-payment goal", async () => {
    const res = await DELETE(req("DELETE"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(state.deleteFilters).toEqual([
      ["user_id", "user-1"],
      ["kind", "down_payment"],
    ]);
  });

  it("stays idempotent while migration 00018 is not applied yet", async () => {
    state.deleteError = { code: "42P01", message: 'relation "goals" does not exist' };
    const res = await DELETE(req("DELETE"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
