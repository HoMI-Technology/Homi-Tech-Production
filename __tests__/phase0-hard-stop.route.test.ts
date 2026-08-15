import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AssessmentInputs } from "@/lib/scoring";
import { PHASE0_PAUSE_COPY } from "@/lib/advisor/phase0";

/**
 * CEO HOLD — signed-in Phase 0 freeze is server-authoritative.
 * A clean current message / omitted client flag must not produce READY.
 */

const SAMPLE: AssessmentInputs = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.2,
  emergencyFundMonths: 6,
  creditScore: 750,
  lifeStability: 8,
  confidenceLevel: 7,
  partnerAlignment: 7,
  fomoLevel: 3,
  timeHorizonMonths: 18,
  savingsRate: 0.15,
  downPaymentProgress: 0.5,
  monthlyHousingRatio: 0.28,
};

const state = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  phase0: {
    frozen: true,
    frozen_until: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    financial_stress: false,
    self_harm: false,
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: state.user ? { subscription_tier: "plus", role: null } : null,
            error: null,
          }),
        }),
      }),
    }),
    rpc: async (fn: string) => {
      if (fn === "phase0_get_state" || fn === "phase0_ingest") {
        return { data: state.phase0, error: null };
      }
      return { data: true, error: null };
    },
  }),
}));

vi.mock("@/lib/ratelimit", () => ({
  getClientIp: () => "203.0.113.7",
  rateLimit: async () => ({ allowed: true, remaining: 29 }),
}));

vi.mock("@/lib/advisor/memory", () => ({
  persistCompanionExchange: async () => null,
}));

describe("signed-in Phase 0 freeze is a hard stop", () => {
  beforeEach(() => {
    state.user = { id: "u1" };
    state.phase0 = {
      frozen: true,
      frozen_until: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      financial_stress: false,
      self_harm: false,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })),
    );
  });

  it("POST /api/advisor refuses a clean line when the server row is frozen", async () => {
    const { POST } = await import("@/app/api/advisor/route");
    const res = await POST(
      new Request("http://localhost/api/advisor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "am I ready to buy?" }],
          phase0Frozen: false,
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { reply: string; source: string; verdict?: unknown };
    expect(body.source).toBe("phase0");
    expect(body.reply).toContain("Your assessment is paused");
    expect(body.reply).not.toMatch(/\bREADY\b/);
    expect(body.verdict).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("POST /api/scoring refuses and does not return a verdict or score", async () => {
    const { POST } = await import("@/app/api/scoring/route");
    const res = await POST(
      new Request("http://localhost/api/scoring", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(SAMPLE),
      }),
    );
    expect(res.status).toBe(423);
    const body = (await res.json()) as {
      source?: string;
      verdict?: unknown;
      score?: unknown;
      error?: string;
    };
    expect(body.source).toBe("phase0");
    expect(body.error).toBe(PHASE0_PAUSE_COPY);
    expect(body.verdict).toBeUndefined();
    expect(body.score).toBeUndefined();
  });
});
