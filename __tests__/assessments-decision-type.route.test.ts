import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * POST /api/assessments — decision_type honesty (Plans.md 5.1).
 *
 * The route must persist the decisionType the client picked (defaulting to
 * "home_buying" when absent) and reject anything outside the server-side
 * SERVER_ACTIVE_DECISION_TYPES allowlist — including canon-but-inactive
 * verticals, so "Coming soon" types cannot be smuggled in ahead of activation.
 *
 * Note the allowlist is SERVER_ACTIVE_DECISION_TYPES, not the client-facing
 * ACTIVE_DECISION_TYPES: activation is a two-deploy ParallelChange (5.9), so
 * the two lists are deliberately allowed to differ by one vertical.
 */

const state = vi.hoisted(() => ({
  user: { id: "user-1", email: "u@example.com" } as { id: string; email: string } | null,
  insertCalls: [] as Record<string, unknown>[],
}));

vi.mock("next/server", async (importOriginal) => {
  const orig = await importOriginal<typeof import("next/server")>();
  return { ...orig, after: () => {} };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table !== "assessments") throw new Error(`unexpected table ${table}`);
      return {
        insert: (payload: Record<string, unknown>) => {
          state.insertCalls.push(payload);
          return {
            select: () => ({ single: async () => ({ data: { id: "a-1" }, error: null }) }),
          };
        },
      };
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => null }));
vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: async () => ({ entitlements: { unlimitedRescoring: true } }),
}));
vi.mock("@/lib/ratelimit", () => ({
  getClientIp: () => "203.0.113.9",
  rateLimit: async () => ({ allowed: true }),
}));
vi.mock("@/lib/attribution", () => ({
  readAttributionCookie: () => null,
  isPartnerInviteRef: () => false,
  resolvePartnerReferralSource: () => null,
}));
vi.mock("@/lib/email/send", () => ({ sendLifecycleEmail: async () => {} }));
vi.mock("@/lib/analytics/server", () => ({ captureServerEvent: () => {} }));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/assessments/route";

const VALID_INPUTS = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.15,
  emergencyFundMonths: 4,
  creditScore: 720,
  lifeStability: 7,
  confidenceLevel: 7,
  partnerAlignment: null,
  fomoLevel: 3,
  timeHorizonMonths: 9,
  savingsRate: 0.15,
  downPaymentProgress: 0.6,
};

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/assessments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  state.insertCalls = [];
});

describe("POST /api/assessments decision_type", () => {
  it("persists an explicit active decisionType", async () => {
    const res = await post({ inputs: VALID_INPUTS, kind: "full", decisionType: "home_buying" });
    expect(res.status).toBe(200);
    expect(state.insertCalls).toHaveLength(1);
    expect(state.insertCalls[0].decision_type).toBe("home_buying");
  });

  it("defaults decision_type to home_buying when the payload omits it", async () => {
    const res = await post({ inputs: VALID_INPUTS, kind: "full" });
    expect(res.status).toBe(200);
    expect(state.insertCalls[0].decision_type).toBe("home_buying");
  });

  /**
   * Plans.md 5.9 phase 1 (expand). The server accepts "car" one deploy BEFORE
   * the picker offers it, so a new client hitting an old pod mid-rollout can
   * never take a 400. The picker staying hidden is asserted separately, in
   * __tests__/questions-flow.test.ts.
   */
  it("accepts car — server allowlist widened ahead of the picker", async () => {
    const res = await post({ inputs: VALID_INPUTS, kind: "full", decisionType: "car" });
    expect(res.status).toBe(200);
    expect(state.insertCalls).toHaveLength(1);
    expect(state.insertCalls[0].decision_type).toBe("car");
  });

  it("rejects a canon-but-inactive vertical with 400 and no insert", async () => {
    const res = await post({ inputs: VALID_INPUTS, kind: "full", decisionType: "career_change" });
    expect(res.status).toBe(400);
    expect(state.insertCalls).toHaveLength(0);
  });

  it("rejects an unknown decisionType with 400 and no insert", async () => {
    const res = await post({ inputs: VALID_INPUTS, kind: "full", decisionType: "banana" });
    expect(res.status).toBe(400);
    expect(state.insertCalls).toHaveLength(0);
  });

  it("rejects kind:shadow — a read is not an assessment", async () => {
    const res = await post({ inputs: VALID_INPUTS, kind: "shadow" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { saved?: boolean; error?: string };
    expect(body.saved).toBe(false);
    expect(body.error).toMatch(/not assessments/i);
    expect(state.insertCalls).toHaveLength(0);
  });
});
