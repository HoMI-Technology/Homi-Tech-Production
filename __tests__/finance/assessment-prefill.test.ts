// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  buildAssessmentPrefill,
  financeStateToPrefill,
  isQuickReCheckMode,
} from "@/lib/finance/assessment-prefill";
import { DEFAULT_FINANCE_STATE, type FinanceState } from "@/lib/finance/store";
import { bankResponsesToInputs, type ConflictResponses } from "@/lib/questions/to-inputs";

const NO_CONFLICT: ConflictResponses = { referralSource: null, deadlineOrigin: null };

function state(overrides: Partial<FinanceState>): FinanceState {
  return { ...DEFAULT_FINANCE_STATE, ...overrides };
}

describe("financeStateToPrefill", () => {
  it("maps income, debt payments, and savings onto both verticals' bank ids", () => {
    const prefill = financeStateToPrefill(
      state({ monthlyIncome: 7000, monthlyDebtPayments: 800, liquidSavings: 25000 }),
    );
    expect(prefill.responses.fin_income).toBe(7000);
    expect(prefill.responses.car_fin_income).toBe(7000);
    expect(prefill.responses.fin_debt_payments).toBe(800);
    expect(prefill.responses.car_fin_debt_payments).toBe(800);
    expect(prefill.responses.fin_savings_total).toBe(25000);
    expect(prefill.questionIds).toContain("fin_income");
    expect(prefill.questionIds).toContain("fin_emergency_fund");
  });

  it("never pre-fills a zero number — it would read as unanswered and block Next", () => {
    const prefill = financeStateToPrefill(
      state({ monthlyIncome: 0, monthlyDebtPayments: 0, liquidSavings: 0 }),
    );
    expect(prefill.responses.fin_income).toBeUndefined();
    expect(prefill.responses.car_fin_income).toBeUndefined();
    expect(prefill.responses.fin_debt_payments).toBeUndefined();
    expect(prefill.responses.fin_savings_total).toBeUndefined();
  });

  it.each([
    [8, "6_plus", "6plus"],
    [6, "6_plus", "6plus"],
    [4.5, "4_5", "3to6"],
    [2.5, "2_3", "1to3"],
    [1, "1", "1to3"],
    [0.5, "none", "lt1"],
  ])(
    "runway %s months → home %s / car %s emergency choices",
    (months, homeChoice, carChoice) => {
      // runway = liquidSavings / (expenses + debt); force outflow to 1000.
      const prefill = financeStateToPrefill(
        state({ liquidSavings: months * 1000, monthlyExpenses: 600, monthlyDebtPayments: 400 }),
      );
      expect(prefill.responses.fin_emergency_fund).toBe(homeChoice);
      expect(prefill.responses.car_fin_emergency_fund).toBe(carChoice);
    },
  );

  it("treats zero outflow (infinite runway) as the top band", () => {
    const prefill = financeStateToPrefill(
      state({ liquidSavings: 5000, monthlyExpenses: 0, monthlyDebtPayments: 0 }),
    );
    expect(prefill.responses.fin_emergency_fund).toBe("6_plus");
    expect(prefill.responses.car_fin_emergency_fund).toBe("6plus");
  });

  it("feeds bankResponsesToInputs into a complete AssessmentInputs", () => {
    const prefill = financeStateToPrefill(
      state({
        monthlyIncome: 6000,
        monthlyDebtPayments: 600,
        liquidSavings: 30000,
        monthlyExpenses: 3400,
      }),
    );
    const inputs = bankResponsesToInputs(prefill.responses, NO_CONFLICT, "home_buying");
    expect(inputs.debtToIncomeRatio).toBeCloseTo(0.1);
    expect(inputs.emergencyFundMonths).toBe(8); // 30000 / 4000 = 7.5 → 6_plus → 8
    expect(inputs.savingsRate).toBeGreaterThan(0);
    expect(inputs.dtiProvenance).toBe("self_report");
    expect(inputs.runwayProvenance).toBe("self_report");
  });
});

describe("buildAssessmentPrefill", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/assessment");
  });

  it("returns null when the user has never saved finance numbers", () => {
    expect(buildAssessmentPrefill()).toBeNull();
  });

  it("prefills from saved finance state under homi:finance", () => {
    window.localStorage.setItem(
      "homi:finance",
      JSON.stringify({ monthlyIncome: 9000, monthlyDebtPayments: 900, liquidSavings: 40000 }),
    );
    const prefill = buildAssessmentPrefill();
    expect(prefill).not.toBeNull();
    expect(prefill?.responses.fin_income).toBe(9000);
    expect(prefill?.responses.fin_debt_payments).toBe(900);
    expect(prefill?.responses.fin_savings_total).toBe(40000);
  });
});

describe("isQuickReCheckMode", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/assessment");
  });

  it("is true only for ?mode=quick", () => {
    expect(isQuickReCheckMode()).toBe(false);
    window.history.replaceState(null, "", "/assessment?mode=quick");
    expect(isQuickReCheckMode()).toBe(true);
    window.history.replaceState(null, "", "/assessment?mode=full");
    expect(isQuickReCheckMode()).toBe(false);
  });
});
