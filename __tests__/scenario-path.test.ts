import { describe, expect, it } from "vitest";
import { DEFAULT_SIMULATION_INPUTS } from "@/lib/decisions/simulate";
import { generatePathFromScenario } from "@/lib/readiness";
import type { AssessmentResult } from "@/lib/scoring/public";

const scored: AssessmentResult = {
  score: 62,
  verdict: "BUILD_FIRST",
  financial: {
    debtToIncome: 8,
    downPayment: 4,
    emergencyFund: 6,
    creditHealth: 2,
    total: 20,
  },
  emotional: {
    lifeStability: 6,
    confidenceLevel: 6,
    partnerAlignment: 6,
    fomoCheck: 4,
    total: 22,
    singleRedistribution: false,
  },
  timing: {
    timeHorizon: 8,
    savingsRate: 6,
    downPaymentProgress: 6,
    total: 20,
  },
  hardStops: [],
  warnings: [],
};

describe("generatePathFromScenario", () => {
  it("builds a wait-12 funding path with down-payment gap step", () => {
    const path = generatePathFromScenario({
      inputs: {
        ...DEFAULT_SIMULATION_INPUTS,
        homePrice: 400000,
        downPaymentSaved: 20000,
        monthlySavings: 1500,
      },
      scenarioKey: "wait-12",
      assessmentResult: scored,
    });
    expect(path.mode).toBe("build");
    expect(path.score).toBe(62);
    expect(path.verdict).toBe("BUILD_FIRST");
    expect(path.steps.length).toBeGreaterThan(1);
    expect(path.steps.some((s) => /wait|down payment|fund/i.test(s.title))).toBe(true);
    expect(path.steps.some((s) => s.fundingTarget != null && s.fundingTarget > 0)).toBe(true);
  });

  it("buy-now path points at preflight", () => {
    const path = generatePathFromScenario({
      inputs: DEFAULT_SIMULATION_INPUTS,
      scenarioKey: "buy-now",
      assessmentResult: scored,
    });
    expect(path.steps.some((s) => s.href === "/tools/preflight")).toBe(true);
  });

  it("refuses to invent readiness without an assessment", () => {
    expect(() =>
      generatePathFromScenario({
        inputs: DEFAULT_SIMULATION_INPUTS,
        scenarioKey: "wait-12",
      }),
    ).toThrow(/requires a scored assessment/i);
  });
});
