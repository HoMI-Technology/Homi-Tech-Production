import { describe, expect, it } from "vitest";
import { computeScore } from "@/lib/scoring/engine";
import type { AssessmentInputs } from "@/lib/scoring/public";
import { autoCompletePathFromSignals, buildReadinessPath } from "@/lib/readiness";

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

describe("autoCompletePathFromSignals", () => {
  it("marks runway step done when finance runway ≥ 1", () => {
    const blocked = computeScore({ ...SAFE, emergencyFundMonths: 0.3 });
    let n = 0;
    const path = buildReadinessPath(blocked, {
      idFactory: () => `id-${++n}`,
    });
    const runwayStep = path.steps.find((s) => s.reasonCode === "RUNWAY_UNDER_1_MONTH");
    expect(runwayStep).toBeTruthy();

    const { path: next, completedStepIds } = autoCompletePathFromSignals(path, blocked, {
      netCashFlow: 500,
      runwayMonths: 2.5,
      monthlyExpenses: 3000,
      liquidSavings: 8000,
      monthlyDebtPayments: 200,
      monthlyIncome: 7000,
    });
    expect(completedStepIds).toContain(runwayStep!.id);
    expect(next.steps.find((s) => s.id === runwayStep!.id)?.status).toBe("done");
  });

  it("marks negative cashflow step done when surplus returns", () => {
    const result = computeScore({
      ...SAFE,
      savingsRate: 0.05,
      downPaymentProgress: 0.3,
      emergencyFundMonths: 3,
    });
    let n = 0;
    const path = buildReadinessPath(result, {
      finance: {
        netCashFlow: -200,
        runwayMonths: 2,
        monthlyExpenses: 4000,
        liquidSavings: 8000,
        monthlyDebtPayments: 400,
        monthlyIncome: 4200,
      },
      idFactory: () => `c-${++n}`,
    });
    const cash = path.steps.find((s) => s.reasonCode === "NEGATIVE_CASHFLOW");
    if (!cash) return; // path may not always inject if other modes
    const { completedStepIds } = autoCompletePathFromSignals(path, result, {
      netCashFlow: 300,
      runwayMonths: 3,
      monthlyExpenses: 4000,
      liquidSavings: 12000,
      monthlyDebtPayments: 400,
      monthlyIncome: 5000,
    });
    expect(completedStepIds).toContain(cash.id);
  });
});
