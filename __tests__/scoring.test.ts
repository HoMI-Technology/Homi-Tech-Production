import { describe, expect, it } from "vitest";
import { computeScore } from "@/lib/scoring/engine";
import { computeShadowScore, SHADOW_DEFAULTS } from "@/lib/scoring/shadow";
import { scoreToVerdict, PILLAR_MAX_POINTS, type AssessmentInputs } from "@/lib/scoring/public";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** The documented canonical example from lib/scoring/engine.ts's JSDoc. */
const DOCUMENTED_EXAMPLE: AssessmentInputs = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.2,
  emergencyFundMonths: 6,
  creditScore: 750,
  lifeStability: 8,
  confidenceLevel: 7,
  partnerAlignment: 9,
  fomoLevel: 3,
  timeHorizonMonths: 18,
  savingsRate: 0.22,
  downPaymentProgress: 0.85,
};

/** Inputs engineered to maximize every pillar (35/35/30 => 100). */
const PERFECT_INPUTS: AssessmentInputs = {
  debtToIncomeRatio: 0.1,
  downPaymentPercent: 0.3,
  emergencyFundMonths: 12,
  creditScore: 800,
  lifeStability: 10,
  confidenceLevel: 10,
  partnerAlignment: 10,
  fomoLevel: 1,
  timeHorizonMonths: 24,
  savingsRate: 0.3,
  downPaymentProgress: 1.0,
};

/** Baseline safe inputs that clear every hard-stop, used to isolate one trip at a time. */
const SAFE_BASE: AssessmentInputs = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.2,
  emergencyFundMonths: 6,
  creditScore: 750,
  lifeStability: 8,
  confidenceLevel: 7,
  partnerAlignment: 9,
  fomoLevel: 3,
  timeHorizonMonths: 18,
  savingsRate: 0.22,
  downPaymentProgress: 0.85,
  monthlyHousingRatio: 0.3,
};

describe("computeScore — documented canonical example", () => {
  it("scores 92 and verdicts READY for the documented example inputs", () => {
    const result = computeScore(DOCUMENTED_EXAMPLE);
    expect(result.score).toBe(92);
    expect(result.verdict).toBe("READY");
  });

  it("produces the documented pillar totals (35 financial, 27 emotional, 30 timing)", () => {
    const result = computeScore(DOCUMENTED_EXAMPLE);
    expect(result.financial.total).toBe(35);
    expect(result.emotional.total).toBe(27);
    expect(result.timing.total).toBe(30);
  });

  it("has no hard stops for the documented example", () => {
    const result = computeScore(DOCUMENTED_EXAMPLE);
    expect(result.hardStops).toEqual([]);
  });
});

describe("scoreToVerdict — threshold boundaries", () => {
  it.each([
    [100, "READY"],
    [80, "READY"],
    [79.9, "ALMOST_THERE"],
    [65, "ALMOST_THERE"],
    [64.9, "BUILD_FIRST"],
    [50, "BUILD_FIRST"],
    [49.9, "NOT_YET"],
    [0, "NOT_YET"],
  ] as const)("maps score %s to %s", (score, expected) => {
    expect(scoreToVerdict(score)).toBe(expected);
  });
});

describe("hard stops — each forces NOT_YET while preserving the numeric score", () => {
  it("DTI > 50% forces NOT_YET while the numeric score reflects the real (lower DTI-bucket) total", () => {
    const withStop = computeScore({ ...SAFE_BASE, debtToIncomeRatio: 0.51 });

    expect(withStop.verdict).toBe("NOT_YET");
    expect(withStop.hardStops.map((h) => h.code)).toContain("DTI_OVER_50");
    // DTI moves from <=28% (10pts) to >43% (0pts) bucket, so the financial
    // total drops by 10 — but the score is still the real computed number,
    // not silently zeroed, and hard-stops don't clamp the score itself.
    expect(typeof withStop.score).toBe("number");
    expect(withStop.score).toBeGreaterThan(0);
    expect(withStop.financial.debtToIncome).toBe(0);
  });

  it("monthlyHousingRatio > 45% forces NOT_YET while preserving the numeric score", () => {
    const base = computeScore(SAFE_BASE);
    const tripped = computeScore({ ...SAFE_BASE, monthlyHousingRatio: 0.46 });

    expect(tripped.verdict).toBe("NOT_YET");
    expect(tripped.hardStops.map((h) => h.code)).toContain("HOUSING_RATIO_OVER_45");
    // Only the housing ratio changed — the score itself is untouched because
    // monthlyHousingRatio does not feed any point calculation, only the guard.
    expect(tripped.score).toBe(base.score);
  });

  it("emergencyFundMonths < 1 forces NOT_YET while preserving the numeric score", () => {
    const tripped = computeScore({ ...SAFE_BASE, emergencyFundMonths: 0.5 });

    expect(tripped.verdict).toBe("NOT_YET");
    expect(tripped.hardStops.map((h) => h.code)).toContain("RUNWAY_UNDER_1_MONTH");
    expect(typeof tripped.score).toBe("number");
    expect(tripped.score).toBeGreaterThan(0);
  });

  it("creditScore < 620 forces NOT_YET while preserving the numeric score", () => {
    const tripped = computeScore({ ...SAFE_BASE, creditScore: 600 });

    expect(tripped.verdict).toBe("NOT_YET");
    expect(tripped.hardStops.map((h) => h.code)).toContain("CREDIT_UNDER_620");
    expect(typeof tripped.score).toBe("number");
    expect(tripped.score).toBeGreaterThan(0);
  });

  it("multiple simultaneous hard stops all appear in the hardStops array", () => {
    const tripped = computeScore({
      ...SAFE_BASE,
      debtToIncomeRatio: 0.55,
      creditScore: 590,
      emergencyFundMonths: 0,
    });

    expect(tripped.verdict).toBe("NOT_YET");
    const codes = tripped.hardStops.map((h) => h.code);
    expect(codes).toContain("DTI_OVER_50");
    expect(codes).toContain("CREDIT_UNDER_620");
    expect(codes).toContain("RUNWAY_UNDER_1_MONTH");
    expect(tripped.hardStops).toHaveLength(3);
  });
});

describe("pillar maxima — perfect inputs", () => {
  it("perfect inputs yield 35/35/30 and a total of 100", () => {
    const result = computeScore(PERFECT_INPUTS);
    expect(result.financial.total).toBe(35);
    expect(result.emotional.total).toBe(35);
    expect(result.timing.total).toBe(30);
    expect(result.score).toBe(100);
    expect(result.verdict).toBe("READY");
  });

  it("financial sub-factors individually hit their documented maxima", () => {
    const result = computeScore(PERFECT_INPUTS);
    expect(result.financial.debtToIncome).toBe(10);
    expect(result.financial.downPayment).toBe(10);
    expect(result.financial.emergencyFund).toBe(8);
    expect(result.financial.creditHealth).toBe(7);
  });

  it("timing sub-factors individually hit their documented maxima", () => {
    const result = computeScore(PERFECT_INPUTS);
    expect(result.timing.timeHorizon).toBe(10);
    expect(result.timing.savingsRate).toBe(10);
    expect(result.timing.downPaymentProgress).toBe(10);
  });
});

describe("single-buyer redistribution", () => {
  it("flags singleRedistribution true when partnerAlignment is null", () => {
    const result = computeScore({ ...DOCUMENTED_EXAMPLE, partnerAlignment: null });
    expect(result.emotional.singleRedistribution).toBe(true);
  });

  it("does not flag singleRedistribution when partnerAlignment is provided", () => {
    const result = computeScore(DOCUMENTED_EXAMPLE);
    expect(result.emotional.singleRedistribution).toBe(false);
  });

  it("redistributes proportionally so single-buyer total equals partnered total when all sliders are 10 and fomo is 1", () => {
    const partnered = computeScore({
      ...PERFECT_INPUTS,
      partnerAlignment: 10,
    });
    const single = computeScore({
      ...PERFECT_INPUTS,
      partnerAlignment: null,
    });

    expect(partnered.emotional.singleRedistribution).toBe(false);
    expect(single.emotional.singleRedistribution).toBe(true);
    // Proportionality holds exactly at the all-10s/fomo-1 corner: both total 35.
    expect(single.emotional.total).toBe(partnered.emotional.total);
    expect(single.emotional.total).toBe(35);
  });

  it("sets partnerAlignment to 0 in the breakdown for single buyers", () => {
    const result = computeScore({ ...DOCUMENTED_EXAMPLE, partnerAlignment: null });
    expect(result.emotional.partnerAlignment).toBe(0);
  });

  it("splits the partner pool evenly when all other emotional factors earn zero", () => {
    const result = computeScore({
      ...DOCUMENTED_EXAMPLE,
      partnerAlignment: null,
      lifeStability: 1,
      confidenceLevel: 1,
      fomoLevel: 10, // worst FOMO score (0 points)
    });
    // lifeStabilityRaw = sliderToPoints(1,9) = 0, confidenceRaw = 0, fomoRaw = fomoToPoints(10,8) = 0
    // ratioSum === 0 => even 3/3/3 split
    expect(result.emotional.lifeStability).toBe(3);
    expect(result.emotional.confidenceLevel).toBe(3);
    expect(result.emotional.fomoCheck).toBe(3);
    expect(result.emotional.total).toBe(9);
    expect(result.emotional.singleRedistribution).toBe(true);
  });
});

describe("FOMO inversion", () => {
  it("fomoLevel 1 (lowest pressure) yields fomoCheck 8 (max) when partnered with mid sliders", () => {
    const result = computeScore({
      ...DOCUMENTED_EXAMPLE,
      lifeStability: 5,
      confidenceLevel: 5,
      partnerAlignment: 5,
      fomoLevel: 1,
    });
    expect(result.emotional.fomoCheck).toBe(8);
  });

  it("fomoLevel 10 (highest pressure) yields fomoCheck 0", () => {
    const result = computeScore({
      ...DOCUMENTED_EXAMPLE,
      lifeStability: 5,
      confidenceLevel: 5,
      partnerAlignment: 5,
      fomoLevel: 10,
    });
    expect(result.emotional.fomoCheck).toBe(0);
  });
});

describe("sliderToPoints edge behavior", () => {
  it("slider value 10 always yields the pillar maximum (lifeStability 10 -> 9)", () => {
    const result = computeScore({ ...DOCUMENTED_EXAMPLE, lifeStability: 10 });
    expect(result.emotional.lifeStability).toBe(9);
  });
});

describe("computeShadowScore", () => {
  const shadowInputs = {
    debtToIncomeRatio: 0.25,
    emergencyFundMonths: 6,
    creditScore: 750,
    confidenceLevel: 7,
    fomoLevel: 3,
    timeHorizonMonths: 18,
  };

  it("equals computeScore with SHADOW_DEFAULTS merged in", () => {
    const shadowResult = computeShadowScore(shadowInputs);
    const fullResult = computeScore({ ...SHADOW_DEFAULTS, ...shadowInputs });
    expect(shadowResult).toEqual(fullResult);
  });

  it("produces a valid AssessmentResult shape", () => {
    const result = computeShadowScore(shadowInputs);
    expect(typeof result.score).toBe("number");
    expect(["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"]).toContain(result.verdict);
    expect(result.financial.total).toBeGreaterThanOrEqual(0);
    expect(result.emotional.total).toBeGreaterThanOrEqual(0);
    expect(result.timing.total).toBeGreaterThanOrEqual(0);
  });
});

describe("determinism", () => {
  it("returns a deeply equal result for the same input computed twice", () => {
    const first = computeScore(DOCUMENTED_EXAMPLE);
    const second = computeScore(DOCUMENTED_EXAMPLE);
    expect(first).toEqual(second);
  });

  it("is deterministic for hard-stop-tripping inputs too", () => {
    const inputs = { ...SAFE_BASE, creditScore: 600, debtToIncomeRatio: 0.55 };
    const first = computeScore(inputs);
    const second = computeScore(inputs);
    expect(first).toEqual(second);
  });

  it("is deterministic for shadow score inputs", () => {
    const shadowInputs = {
      debtToIncomeRatio: 0.4,
      emergencyFundMonths: 2,
      creditScore: 680,
      confidenceLevel: 4,
      fomoLevel: 8,
      timeHorizonMonths: 4,
    };
    const first = computeShadowScore(shadowInputs);
    const second = computeShadowScore(shadowInputs);
    expect(first).toEqual(second);
  });
});

describe("PILLAR_MAX_POINTS canon", () => {
  it("matches the documented 35/35/30 split", () => {
    expect(PILLAR_MAX_POINTS.financial).toBe(35);
    expect(PILLAR_MAX_POINTS.emotional).toBe(35);
    expect(PILLAR_MAX_POINTS.timing).toBe(30);
    expect(
      PILLAR_MAX_POINTS.financial + PILLAR_MAX_POINTS.emotional + PILLAR_MAX_POINTS.timing,
    ).toBe(100);
  });
});
