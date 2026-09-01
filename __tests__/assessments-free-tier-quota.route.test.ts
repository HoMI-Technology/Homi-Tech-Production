import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "user-1", email: "u@example.com" } as { id: string; email: string } | null,
  completed: {} as Record<string, number>,
  insertCalls: [] as Record<string, unknown>[],
  deletedIds: [] as string[],
  countFilters: [] as Record<string, string>[],
}));

vi.mock("next/server", async (importOriginal) => {
  const orig = await importOriginal<typeof import("next/server")>();
  return { ...orig, after: () => {} };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === "outcome_surveys" || table === "assessment_outcome_baselines") {
        return { insert: async () => ({ error: null }) };
      }
      if (table !== "assessments") throw new Error(`unexpected table ${table}`);
      const countQuery = () => {
        const filters: Record<string, string> = {};
        const q = {
          eq(col: string, val: string) {
            filters[col] = val;
            return q;
          },
          then(resolve: (value: { count: number; error: null }) => void) {
            state.countFilters.push({ ...filters });
            const dt = filters.decision_type;
            const n = dt ? (state.completed[dt] ?? 0) : Object.values(state.completed).reduce((a, b) => a + b, 0);
            resolve({ count: n, error: null });
          },
        };
        return q;
      };
      return {
        select: () => countQuery(),
        insert: (payload: Record<string, unknown>) => {
          state.insertCalls.push(payload);
          const dt = String(payload.decision_type ?? "home_buying");
          state.completed[dt] = (state.completed[dt] ?? 0) + 1;
          return {
            select: () => ({
              single: async () => ({ data: { id: payload.id ?? "a-new" }, error: null }),
            }),
          };
        },
        delete: () => ({
          eq: (_col: string, id: string) => ({
            eq: async () => {
              state.deletedIds.push(id);
              return { error: null };
            },
          }),
        }),
      };
    },
    rpc: async () => ({ data: { frozen: false, frozen_until: null }, error: null }),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => null }));
vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: async () => ({ entitlements: { unlimitedRescoring: false } }),
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
vi.mock("@/lib/advisor/phase0/server", () => ({
  loadPhase0ServerState: async () => ({ frozen: false }),
  phase0RefuseIfFrozen: async () => null,
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/assessments/route";
import { FREE_TIER_LOCKED_MESSAGE } from "@/lib/assessment/free-tier-quota";

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
  state.completed = {};
  state.insertCalls = [];
  state.deletedIds = [];
  state.countFilters = [];
});

describe("D10 POST /api/assessments free-tier quota", () => {
  it("402s a second home assessment and does not insert", async () => {
    state.completed.home_buying = 1;
    const res = await post({ inputs: VALID_INPUTS, kind: "full", decisionType: "home_buying" });
    expect(res.status).toBe(402);
    const body = (await res.json()) as { code?: string; error?: string };
    expect(body.code).toBe("rescoring_locked");
    expect(body.error).toBe(FREE_TIER_LOCKED_MESSAGE);
    expect(state.insertCalls).toHaveLength(0);
    expect(state.countFilters.some((f) => f.decision_type === "home_buying")).toBe(true);
  });

  it("allows a first car assessment after home is already completed", async () => {
    state.completed.home_buying = 1;
    const res = await post({ inputs: VALID_INPUTS, kind: "full", decisionType: "car" });
    expect(res.status).toBe(200);
    expect(state.insertCalls).toHaveLength(1);
    expect(state.insertCalls[0]?.decision_type).toBe("car");
    expect(state.deletedIds).toHaveLength(0);
    expect(state.countFilters.some((f) => f.decision_type === "car")).toBe(true);
  });

  it("treats a missing decisionType as home_buying for the quota", async () => {
    state.completed.home_buying = 1;
    const res = await post({ inputs: VALID_INPUTS, kind: "full" });
    expect(res.status).toBe(402);
    expect(state.insertCalls).toHaveLength(0);
    expect(state.countFilters.some((f) => f.decision_type === "home_buying")).toBe(true);
  });
});
