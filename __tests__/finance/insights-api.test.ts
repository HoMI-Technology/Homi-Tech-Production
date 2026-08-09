import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Route tests for /api/finance/insights — durable agent insights (Phase 3).
 * Ownership is session-derived; RLS is enforced in the migration; the route
 * degrades gracefully when the migration is not applied yet.
 */

type InsightRow = Record<string, unknown>;

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  rows: [] as InsightRow[],
  selectError: null as { code?: string; message: string } | null,
  insertError: null as { code?: string; message: string } | null,
  inserted: null as InsightRow | null,
  insertCalls: [] as InsightRow[],
  updateError: null as { code?: string; message: string } | null,
  updated: null as InsightRow | null,
  updateFilters: [] as [string, unknown][],
}));

function chainableSelect() {
  const api: Record<string, unknown> = {};
  const self = () => api;
  api.select = self;
  api.eq = self;
  api.is = self;
  api.order = self;
  Object.defineProperty(api, "then", {
    get() {
      return (resolve: (v: unknown) => unknown) =>
        resolve({ data: state.rows, error: state.selectError });
    },
  });
  return api;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table !== "finance_insights") throw new Error(`unexpected table ${table}`);
      return {
        select: () => chainableSelect(),
        insert: (payload: InsightRow) => {
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
        update: () => ({
          eq: (col: string, val: unknown) => {
            state.updateFilters.push([col, val]);
            return {
              eq: (col2: string, val2: unknown) => {
                state.updateFilters.push([col2, val2]);
                return {
                  select: () => ({
                    single: async () => ({
                      data: state.updateError ? null : state.updated,
                      error: state.updateError,
                    }),
                  }),
                };
              },
            };
          },
        }),
      };
    },
  }),
}));

vi.mock("@/lib/ratelimit", () => ({
  getClientIp: () => "203.0.113.9",
  rateLimit: async () => ({ allowed: true }),
}));

import { GET, POST, PATCH } from "@/app/api/finance/insights/route";

const USER_ID = "user-1";

function row(overrides: Record<string, unknown> = {}): InsightRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: USER_ID,
    agent_id: "analyst",
    type: "signal",
    title: "Runway is thinning",
    body: "Your liquid savings cover 2.1 months of expenses.",
    severity: "amber",
    action_label: "Build buffer",
    action_href: "/finance",
    dismissed_at: null,
    created_at: "2026-08-04T12:00:00.000Z",
    updated_at: "2026-08-04T12:00:00.000Z",
    ...overrides,
  };
}

function req(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/finance/insights", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  state.user = { id: USER_ID };
  state.rows = [];
  state.selectError = null;
  state.insertError = null;
  state.inserted = null;
  state.insertCalls = [];
  state.updateError = null;
  state.updated = null;
  state.updateFilters = [];
});

describe("GET /api/finance/insights", () => {
  it("401s anonymous callers", async () => {
    state.user = null;
    const res = await GET(req("GET"));
    expect(res.status).toBe(401);
  });

  it("returns non-dismissed insights ordered newest first", async () => {
    state.rows = [
      row({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", created_at: "2026-08-04T12:00:00.000Z" }),
      row({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", created_at: "2026-08-03T12:00:00.000Z" }),
    ];

    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { insights: Record<string, unknown>[] };
    expect(body.insights).toHaveLength(2);
    expect(body.insights[0].id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(body.insights[0]).toMatchObject({
      agentId: "analyst",
      type: "signal",
      title: "Runway is thinning",
      severity: "amber",
      action: { label: "Build buffer", href: "/finance" },
    });
  });

  it("degrades to empty while migration is not applied", async () => {
    state.selectError = { code: "42P01", message: 'relation "finance_insights" does not exist' };
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ insights: [], deferred: true });
  });

  it("500s with a correlation id on an unexpected database error", async () => {
    state.selectError = { code: "XX000", message: "boom" };
    const res = await GET(req("GET"));
    expect(res.status).toBe(500);
    expect(((await res.json()) as { correlationId?: string }).correlationId).toBeTruthy();
  });
});

describe("POST /api/finance/insights", () => {
  it("401s anonymous callers", async () => {
    state.user = null;
    const res = await POST(
      req("POST", { title: "x", body: "y", agentId: "analyst", type: "signal" }),
    );
    expect(res.status).toBe(401);
  });

  it("400s on invalid insight input", async () => {
    const res = await POST(req("POST", { agentId: "analyst", type: "signal" }));
    expect(res.status).toBe(400);
    expect(state.insertCalls).toHaveLength(0);
  });

  it("400s on an unknown agent id", async () => {
    const res = await POST(
      req("POST", {
        agentId: "not-an-agent",
        type: "signal",
        title: "T",
        body: "B",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("creates an insight scoped to the session user", async () => {
    state.inserted = row({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" });

    const res = await POST(
      req("POST", {
        agentId: "analyst",
        type: "signal",
        title: "Runway is thinning",
        body: "Your liquid savings cover 2.1 months of expenses.",
        severity: "amber",
        action: { label: "Build buffer", href: "/finance" },
      }),
    );

    expect(res.status).toBe(201);
    expect(state.insertCalls).toHaveLength(1);
    expect(state.insertCalls[0]).toMatchObject({
      user_id: USER_ID,
      agent_id: "analyst",
      type: "signal",
      title: "Runway is thinning",
      severity: "amber",
      action_label: "Build buffer",
      action_href: "/finance",
    });

    const body = (await res.json()) as { insight: Record<string, unknown> };
    expect(body.insight.id).toBe("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    expect(body.insight).toMatchObject({
      agentId: "analyst",
      type: "signal",
      severity: "amber",
      action: { label: "Build buffer", href: "/finance" },
    });
  });

  it("defers when the insights table is missing", async () => {
    state.insertError = { code: "PGRST205", message: "not in schema cache" };
    const res = await POST(
      req("POST", {
        agentId: "analyst",
        type: "signal",
        title: "Runway is thinning",
        body: "Your liquid savings cover 2.1 months of expenses.",
      }),
    );
    expect(res.status).toBe(202);
    await expect(res.json()).resolves.toMatchObject({ deferred: true });
  });
});

describe("PATCH /api/finance/insights", () => {
  it("401s anonymous callers", async () => {
    state.user = null;
    const res = await PATCH(req("PATCH", { id: "11111111-1111-4111-8111-111111111111" }));
    expect(res.status).toBe(401);
  });

  it("400s when id is missing or invalid", async () => {
    const res = await PATCH(req("PATCH", {}));
    expect(res.status).toBe(400);
  });

  it("dismisses the caller's insight", async () => {
    state.updated = row({
      id: "11111111-1111-4111-8111-111111111111",
      dismissed_at: "2026-08-04T13:00:00.000Z",
    });

    const res = await PATCH(req("PATCH", { id: "11111111-1111-4111-8111-111111111111" }));
    expect(res.status).toBe(200);
    expect(state.updateFilters).toEqual([
      ["id", "11111111-1111-4111-8111-111111111111"],
      ["user_id", USER_ID],
    ]);
    const body = (await res.json()) as { insight: Record<string, unknown> };
    expect(body.insight.id).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("defers when the insights table is missing", async () => {
    state.updateError = { code: "42P01", message: 'relation "finance_insights" does not exist' };
    const res = await PATCH(req("PATCH", { id: "11111111-1111-4111-8111-111111111111" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ deferred: true });
  });
});
