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
  surveyInserts: [] as Record<string, unknown>[],
  phase0: {
    frozen: false,
    frozen_until: null as string | null,
  },
}));

vi.mock("next/server", async (importOriginal) => {
  const orig = await importOriginal<typeof import("next/server")>();
  return { ...orig, after: () => {} };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === "outcome_surveys") {
        return {
          insert: async (payload: Record<string, unknown> | Record<string, unknown>[]) => {
            const rows = Array.isArray(payload) ? payload : [payload];
            state.surveyInserts.push(...rows);
            return { error: null };
          },
        };
      }
      if (table === "assessment_outcome_baselines") {
        return {
          insert: async () => ({ error: null }),
        };
      }
      if (table !== "assessments") throw new Error(`unexpected table ${table}`);
      return {
        insert: (payload: Record<string, unknown>) => {
          state.insertCalls.push(payload);
          return {
            select: () => ({
              single: async () => ({ data: { id: payload.id ?? "a-1" }, error: null }),
            }),
          };
        },
      };
    },
    rpc: async (fn: string) => {
      if (fn === "phase0_get_state" || fn === "phase0_ingest") {
        return { data: state.phase0, error: null };
      }
      return { data: null, error: null };
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
import { GET, POST } from "@/app/api/assessments/route";

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
  state.user = { id: "user-1", email: "u@example.com" };
  state.insertCalls = [];
  state.surveyInserts = [];
  state.phase0 = { frozen: false, frozen_until: null };
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
    expect(state.surveyInserts.map((row) => row.kind)).toEqual(["day30", "day90", "day365"]);
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
    expect(state.surveyInserts.map((row) => row.kind)).toEqual(["day30", "day90", "day365"]);
    const insights = state.insertCalls[0].insights as { decisionSnapshot?: { verdict?: string } };
    expect(insights.decisionSnapshot?.verdict).toBeTruthy();
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

  it("GET omits verdict/score rows while a signed-in Phase 0 freeze is active", async () => {
    state.phase0 = {
      frozen: true,
      frozen_until: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    };
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      assessments?: unknown[];
      verdict?: unknown;
      score?: unknown;
      phase0?: { frozen?: boolean };
    };
    expect(body.assessments).toEqual([]);
    expect(body.phase0?.frozen).toBe(true);
    expect(body.verdict).toBeUndefined();
    expect(body.score).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/\bREADY\b/);
  });

  it("refuses persist while a signed-in Phase 0 freeze is active", async () => {
    state.phase0 = {
      frozen: true,
      frozen_until: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    };
    const res = await post({ inputs: VALID_INPUTS, kind: "full" });
    expect(res.status).toBe(423);
    expect(state.insertCalls).toHaveLength(0);
    const body = (await res.json()) as { verdict?: unknown; score?: unknown; source?: string };
    expect(body.source).toBe("phase0");
    expect(body.verdict).toBeUndefined();
    expect(body.score).toBeUndefined();
  });

  it("refuses a guest persist — no insert, no verdict", async () => {
    state.user = null;
    const res = await post({ inputs: VALID_INPUTS, kind: "full" });
    expect(res.status).toBe(401);
    expect(state.insertCalls).toHaveLength(0);
    const body = (await res.json()) as { saved?: boolean; verdict?: unknown; score?: unknown };
    expect(body.saved).toBe(false);
    expect(body.verdict).toBeUndefined();
    expect(body.score).toBeUndefined();
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

describe("POST /api/assessments persist-on-verdict (Gate 6 day30)", () => {
  it("writes a decision snapshot and a day30 row for a completed home assess", async () => {
    const res = await post({
      inputs: { ...VALID_INPUTS, selfReportedCreditBand: "good" },
      kind: "full",
      decisionType: "home_buying",
    });
    expect(res.status).toBe(200);

    expect(state.insertCalls).toHaveLength(1);
    const row = state.insertCalls[0];
    const completedAt = row.completed_at as string;
    const insights = row.insights as {
      decisionSnapshot: {
        decision_id: string;
        score: number;
        verdict: string;
        hardStops: unknown[];
        provenance: {
          dti: string;
          downPayment: string;
          runway: string;
          credit: string;
          lookbackDays: number | null;
        };
        self_reported_credit_band: string | null;
        timestamp: string;
        scoring_schema_id: string;
      };
    };

    expect(row.id).toEqual(expect.any(String));
    expect(insights.decisionSnapshot.decision_id).toBe(row.id);
    expect(insights.decisionSnapshot.score).toBe(row.overall_score);
    expect(insights.decisionSnapshot.verdict).toBe(row.verdict);
    expect(insights.decisionSnapshot.hardStops).toEqual(row.hard_stops);
    expect(insights.decisionSnapshot.provenance).toEqual({
      dti: "self_report",
      downPayment: "self_report",
      runway: "self_report",
      credit: "band_ignored",
      lookbackDays: null,
    });
    expect(insights.decisionSnapshot.self_reported_credit_band).toBe("good");
    expect(insights.decisionSnapshot.timestamp).toBe(completedAt);

    expect(state.surveyInserts.map((row) => row.kind)).toEqual(["day30", "day90", "day365"]);
    const survey = state.surveyInserts[0];
    expect(survey.assessment_id).toBe(row.id);
    expect(survey.user_id).toBe("user-1");
    expect(Date.parse(survey.due_at as string) - Date.parse(completedAt)).toBe(
      30 * 24 * 60 * 60 * 1000,
    );
    expect(insights.decisionSnapshot.scoring_schema_id).toBe("readiness-engine-public-v1");
  });

  it("does not write snapshot or day30 when persist is refused", async () => {
    state.user = null;
    const res = await post({ inputs: VALID_INPUTS, kind: "full" });
    expect(res.status).toBe(401);
    expect(state.insertCalls).toHaveLength(0);
    expect(state.surveyInserts).toHaveLength(0);
  });
});
