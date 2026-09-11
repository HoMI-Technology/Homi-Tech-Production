import { describe, expect, it } from "vitest";
import { computeScore } from "@/lib/scoring/engine";
import type { AssessmentInputs } from "@/lib/scoring/public";
import { computeDualHouseholdScore } from "@/lib/household/dual-score";

const SAFE: AssessmentInputs = {
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

describe("computeDualHouseholdScore", () => {
  it("joint score is the min of both members", () => {
    const strong = computeScore(SAFE);
    const weak = computeScore({
      ...SAFE,
      emergencyFundMonths: 2,
      savingsRate: 0.05,
      confidenceLevel: 4,
      fomoLevel: 8,
    });
    const dual = computeDualHouseholdScore(
      { label: "A", result: strong },
      { label: "B", result: weak },
    );
    expect(dual.jointScore).toBe(Math.min(strong.score, weak.score));
    expect(dual.scoreGap).toBeCloseTo(Math.abs(strong.score - weak.score), 5);
  });

  it("hard-stop on either member forces joint NOT_YET", () => {
    const strong = computeScore(SAFE);
    const blocked = computeScore({ ...SAFE, emergencyFundMonths: 0.2 });
    const dual = computeDualHouseholdScore(
      { label: "A", result: strong },
      { label: "B", result: blocked },
    );
    expect(dual.jointVerdict).toBe("NOT_YET");
    expect(dual.jointHardStops.length).toBeGreaterThan(0);
  });
});
