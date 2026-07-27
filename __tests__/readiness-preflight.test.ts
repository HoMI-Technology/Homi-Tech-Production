import { describe, expect, it } from "vitest";
import { computeScore, type AssessmentInputs } from "@/lib/scoring";
import { runPreflight } from "@/lib/readiness";

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

describe("runPreflight", () => {
  it("blocks on assessment hard-stop", () => {
    const result = computeScore({ ...SAFE, emergencyFundMonths: 0.4 });
    const pre = runPreflight({ assessmentResult: result });
    expect(pre.verdict).toBe("DO_NOT_PROCEED");
    expect(pre.findings.some((f) => f.severity === "block")).toBe(true);
  });

  it("blocks on negative cash flow without assessment", () => {
    const pre = runPreflight({
      monthlyIncome: 4000,
      monthlyExpenses: 3500,
      monthlyDebtPayments: 800,
      liquidSavings: 10000,
    });
    expect(pre.verdict).toBe("DO_NOT_PROCEED");
    expect(pre.findings.some((f) => f.signal === "NEGATIVE_CASHFLOW")).toBe(true);
  });

  it("warns on high FOMO without hard blocks", () => {
    const result = computeScore(SAFE);
    const pre = runPreflight({
      assessmentResult: result,
      monthlyIncome: 8000,
      monthlyExpenses: 4000,
      monthlyDebtPayments: 500,
      liquidSavings: 40000,
      externalPressure: 9,
    });
    expect(["WAIT", "PROCEED_WITH_CARE"]).toContain(pre.verdict);
    expect(pre.findings.some((f) => f.signal === "EXTERNAL_PRESSURE")).toBe(true);
  });
});
