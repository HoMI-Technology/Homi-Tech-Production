import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Route tests for /api/tools/overlay — the server side of the T2.6 local-first
 * sync contract for lens-derived tool values. Ownership is RLS-shaped (user_id
 * always from the session) and writes are last-write-wins: a PUT carrying an
 * older client stamp than the stored row is answered `stale` with the newer
 * copy instead of clobbering it.
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
      if (table !== "user_tools_overlay") throw new Error(`unexpected table ${table}`);
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

import { GET, PUT } from "@/app/api/tools/overlay/route";

const VALID_OVERLAY = {
  targetPrice: 420000,
  downPaymentSaved: 84000,
  currentRent: 2100,
  assumedRatePct: 6.5,
  termYears: 30,
  taxInsuranceRatePct: 1.2,
  hoaMonthly: 0,
  homeValue: 500000,
  currentMortgageBalance: 320000,
  currentMortgageRatePct: 4.5,
  investedAssets: 120000,
  annualContribution: 12000,
};

function getRequest() {
  return new Request("http://localhost/api/tools/overlay");
}

function putRequest(body: unknown) {
  return new Request("http://localhost/api/tools/overlay", {
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

describe("GET /api/tools/overlay", () => {
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
    state.row = { state: VALID_OVERLAY, client_updated_at: "1720000000000" };
    const res = await GET(getRequest());
    const body = await res.json();
    expect(body.state).toEqual(VALID_OVERLAY);
    expect(body.client_updated_at).toBe(1720000000000);
  });

  it("reports honestly empty when the table is not migrated yet", async () => {
    state.selectError = { code: "42P01", message: "relation does not exist" };
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ state: null });
  });
});

describe("PUT /api/tools/overlay", () => {
  it("401s anonymous callers", async () => {
    state.user = null;
    const res = await PUT(putRequest({ state: VALID_OVERLAY, client_updated_at: 100 }));
    expect(res.status).toBe(401);
  });

  it("400s malformed state", async () => {
    const res = await PUT(
      putRequest({ state: { ...VALID_OVERLAY, targetPrice: "lots" }, client_updated_at: 100 }),
    );
    expect(res.status).toBe(400);
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("accepts a newer stamp, upserting under the session's user_id", async () => {
    state.row = { state: { old: true }, client_updated_at: "100" };
    const res = await PUT(putRequest({ state: VALID_OVERLAY, client_updated_at: 200 }));
    expect(await res.json()).toEqual({ ok: true });
    expect(state.upsertCalls).toHaveLength(1);
    expect(state.upsertCalls[0].payload.user_id).toBe("user-1");
    expect(state.upsertCalls[0].payload.client_updated_at).toBe(200);
    expect(state.upsertCalls[0].options).toEqual({ onConflict: "user_id" });
  });

  it("answers stale with the newer copy instead of clobbering it", async () => {
    state.row = { state: VALID_OVERLAY, client_updated_at: "900" };
    const res = await PUT(
      putRequest({ state: { ...VALID_OVERLAY, targetPrice: 1 }, client_updated_at: 200 }),
    );
    const body = await res.json();
    expect(body.stale).toBe(true);
    expect(body.state).toEqual(VALID_OVERLAY);
    expect(body.client_updated_at).toBe(900);
    expect(state.upsertCalls).toHaveLength(0);
  });

  it("defers gracefully when the table is not migrated yet", async () => {
    state.upsertError = { code: "PGRST205", message: "table not found" };
    const res = await PUT(putRequest({ state: VALID_OVERLAY, client_updated_at: 200 }));
    expect(await res.json()).toEqual({ ok: true, deferred: true });
  });

  it("never trusts a user_id from the body", async () => {
    const res = await PUT(
      putRequest({ state: VALID_OVERLAY, client_updated_at: 200, user_id: "victim-2" }),
    );
    expect(res.status).toBe(200);
    expect(state.upsertCalls[0].payload.user_id).toBe("user-1");
  });
});
