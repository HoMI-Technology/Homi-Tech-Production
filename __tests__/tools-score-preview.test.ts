/**
 * Score Impact Preview helper (lib/tools/score-preview.ts) —
 * projection math stays pure and clamped, and the actual score comes
 * from the server via fetchServerScore (POST /api/scoring), never from
 * a client-side engine import.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssessmentInputs } from "@/lib/scoring/public";
import type { FinanceState } from "@/lib/finance/store";
import { DEFAULT_FINANCE_STATE } from "@/lib/finance/store";
import {
  buildProjectedInputs,
  debtPayoffOverrides,
  previewScoreImpact,
  runwayOverrides,
  SCORE_IMPACT_PROJECTED_LABEL,
} from "@/lib/tools/score-preview";

const BASELINE: AssessmentInputs = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.2,
  emergencyFundMonths: 4,
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

const FINANCE: FinanceState = {
  ...DEFAULT_FINANCE_STATE,
  monthlyIncome: 6000,
  monthlyExpenses: 3000,
  monthlyDebtPayments: 600,
  liquidSavings: 12000,
};

describe("buildProjectedInputs", () => {
  it("applies overrides without mutating the baseline", () => {
    const projected = buildProjectedInputs(BASELINE, {
      debtToIncomeRatio: 0.1,
      emergencyFundMonths: 9,
    });
    expect(projected.debtToIncomeRatio).toBe(0.1);
    expect(projected.emergencyFundMonths).toBe(9);
    // Untouched fields carry over verbatim.
    expect(projected.creditScore).toBe(750);
    expect(projected.fomoLevel).toBe(3);
    // Baseline is immutable.
    expect(BASELINE.debtToIncomeRatio).toBe(0.25);
    expect(BASELINE.emergencyFundMonths).toBe(4);
  });

  it("clamps overrides into the assessment schema bounds", () => {
    const projected = buildProjectedInputs(BASELINE, {
      debtToIncomeRatio: -0.5,
      emergencyFundMonths: 999,
    });
    expect(projected.debtToIncomeRatio).toBe(0);
    expect(projected.emergencyFundMonths).toBe(120);
  });

  it("ignores non-finite overrides", () => {
    const projected = buildProjectedInputs(BASELINE, {
      debtToIncomeRatio: Number.NaN,
      emergencyFundMonths: Number.POSITIVE_INFINITY,
    });
    expect(projected.debtToIncomeRatio).toBe(BASELINE.debtToIncomeRatio);
    expect(projected.emergencyFundMonths).toBe(BASELINE.emergencyFundMonths);
  });
});

describe("debtPayoffOverrides", () => {
  it("lowers DTI by freed payments over income", () => {
    const overrides = debtPayoffOverrides(BASELINE, FINANCE, 600)!;
    // 0.25 - 600/6000 = 0.15
    expect(overrides.debtToIncomeRatio).toBeCloseTo(0.15, 10);
  });

  it("improves the emergency fund when the smaller outflow stretches savings", () => {
    const overrides = debtPayoffOverrides(BASELINE, FINANCE, 600)!;
    // 12000 / (3600 - 600) = 4 → equal to baseline, so NOT applied.
    expect(overrides.emergencyFundMonths).toBeUndefined();

    const improved = debtPayoffOverrides(BASELINE, FINANCE, 300)!;
    // 12000 / (3600 - 300) ≈ 3.64 < baseline 4 → still not applied.
    expect(improved.emergencyFundMonths).toBeUndefined();

    const tightBaseline = { ...BASELINE, emergencyFundMonths: 2 };
    const better = debtPayoffOverrides(tightBaseline, FINANCE, 600)!;
    // 12000 / 3000 = 4 > 2 → applied.
    expect(better.emergencyFundMonths).toBeCloseTo(4, 10);
  });

  it("never projects a negative DTI", () => {
    const overrides = debtPayoffOverrides(BASELINE, FINANCE, 5000)!;
    expect(overrides.debtToIncomeRatio).toBe(0);
  });

  it("returns null when the projection cannot be grounded", () => {
    expect(debtPayoffOverrides(BASELINE, FINANCE, 0)).toBeNull();
    expect(debtPayoffOverrides(BASELINE, FINANCE, -100)).toBeNull();
    expect(debtPayoffOverrides(BASELINE, { ...FINANCE, monthlyIncome: 0 }, 600)).toBeNull();
  });
});

describe("runwayOverrides", () => {
  it("projects the tool's runway as the emergency fund", () => {
    expect(runwayOverrides(BASELINE, 7.2)).toEqual({ emergencyFundMonths: 7.2 });
  });

  it("clamps into schema bounds and rejects nonsense", () => {
    expect(runwayOverrides(BASELINE, 500)).toEqual({ emergencyFundMonths: 120 });
    expect(runwayOverrides(BASELINE, -1)).toBeNull();
    expect(runwayOverrides(BASELINE, Number.NaN)).toBeNull();
  });

  it("returns null when the tool already matches the assessed runway", () => {
    expect(runwayOverrides(BASELINE, 4)).toBeNull();
    expect(runwayOverrides(BASELINE, 4.01)).toBeNull();
  });
});

describe("previewScoreImpact", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubScoringApi(payload: Record<string, unknown>, status = 200) {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(payload), {
          status,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  const SERVER_PAYLOAD = {
    score: 71.6,
    verdict: "ALMOST_THERE",
    financial: { debtToIncome: 8, downPayment: 6, emergencyFund: 7, creditHealth: 9, total: 30 },
    emotional: {
      lifeStability: 8,
      confidenceLevel: 7,
      partnerAlignment: 7,
      fomoCheck: 6,
      total: 28,
      singleRedistribution: false,
    },
    timing: { timeHorizon: 5, savingsRate: 4, downPaymentProgress: 4.6, total: 13.6 },
    warnings: [],
    hardStops: [],
    keyInsight: "insight",
    nextSteps: ["a"],
  };

  it("posts the merged projected inputs to /api/scoring and returns the delta", async () => {
    const fetchMock = stubScoringApi(SERVER_PAYLOAD);
    const preview = await previewScoreImpact(
      BASELINE,
      { score: 62.2, verdict: "BUILD_FIRST" },
      { debtToIncomeRatio: 0.1, emergencyFundMonths: 9 },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/scoring");
    const body = JSON.parse(String(init?.body));
    expect(body.debtToIncomeRatio).toBe(0.1);
    expect(body.emergencyFundMonths).toBe(9);
    expect(body.creditScore).toBe(750);

    expect(preview.baseline).toEqual({ score: 62, verdict: "BUILD_FIRST" });
    expect(preview.projected).toEqual({ score: 72, verdict: "ALMOST_THERE" });
    expect(preview.delta).toBe(10);
  });

  it("propagates a scoring failure instead of inventing a number", async () => {
    stubScoringApi({ error: "Too many requests. Try again in a minute." }, 429);
    await expect(
      previewScoreImpact(BASELINE, { score: 62, verdict: "BUILD_FIRST" }, { debtToIncomeRatio: 0.1 }),
    ).rejects.toThrow(/too many requests/i);
  });
});

describe("honesty label", () => {
  it("stays exactly as mandated", () => {
    expect(SCORE_IMPACT_PROJECTED_LABEL).toBe("Projected — re-take the assessment to confirm");
  });
});
