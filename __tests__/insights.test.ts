import { describe, it, expect } from "vitest";
import { computeScore } from "@/lib/scoring/engine";
import { generateKeyInsight, generateNextSteps } from "@/lib/scoring/insights";
import type { AssessmentInputs } from "@/lib/scoring/public";

const BASE: AssessmentInputs = {
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

describe("generateKeyInsight", () => {
  it("names the hard-stop protection when a red line is active", () => {
    const result = computeScore({ ...BASE, creditScore: 590 });
    const insight = generateKeyInsight(result);
    expect(insight).toContain("red-line");
    expect(insight).toContain("protection");
  });

  it("celebrates alignment when all pillars are >= 80", () => {
    // BASE's emotional pillar sits at 77% — below the aligned threshold —
    // so max the emotional sliders to genuinely align all three pillars.
    const result = computeScore({
      ...BASE,
      lifeStability: 10,
      confidenceLevel: 10,
      partnerAlignment: 10,
      fomoLevel: 1,
    });
    const insight = generateKeyInsight(result);
    expect(insight).toContain("compass becomes a key");
  });

  it("calls out the gap (not 'balanced') when pillars diverge by 15+", () => {
    // Strong financial + timing, weak emotional.
    const result = computeScore({
      ...BASE,
      lifeStability: 2,
      confidenceLevel: 2,
      partnerAlignment: 2,
      fomoLevel: 9,
    });
    const insight = generateKeyInsight(result);
    expect(insight).toContain("the map");
    expect(insight).not.toContain("balanced");
  });

  it("never claims a gap is balanced at exactly the 15-point boundary", () => {
    for (let life = 1; life <= 10; life++) {
      const result = computeScore({ ...BASE, lifeStability: life });
      const insight = generateKeyInsight(result);
      const pcts = [
        (result.financial.total / 35) * 100,
        (result.emotional.total / 35) * 100,
        (result.timing.total / 30) * 100,
      ].map(Math.round);
      const gap = Math.max(...pcts) - Math.min(...pcts);
      if (gap >= 15) expect(insight).not.toContain("balanced");
    }
  });
});

describe("generateNextSteps", () => {
  it("puts hard-stop remediation first", () => {
    const result = computeScore({ ...BASE, debtToIncomeRatio: 0.55 });
    const steps = generateNextSteps(result);
    expect(steps[0]).toContain("debt-to-income");
  });

  it("returns at most 5 steps", () => {
    const result = computeScore({
      ...BASE,
      debtToIncomeRatio: 0.55,
      emergencyFundMonths: 0.5,
      creditScore: 590,
      lifeStability: 1,
      confidenceLevel: 1,
      fomoLevel: 10,
      savingsRate: 0.01,
      downPaymentProgress: 0.05,
      timeHorizonMonths: 1,
    });
    expect(generateNextSteps(result).length).toBeLessThanOrEqual(5);
  });

  it("always returns actionable steps, even for a perfect score", () => {
    const steps = generateNextSteps(
      computeScore({
        ...BASE,
        lifeStability: 10,
        confidenceLevel: 10,
        partnerAlignment: 10,
        fomoLevel: 1,
      }),
    );
    expect(steps.length).toBeGreaterThan(0);
  });
});
