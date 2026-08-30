/**
 * Observed-money prefill suggests only allowed question ids — never locked ones.
 */
import { describe, expect, it } from "vitest";
import {
  downPaymentChoiceFromEarmark,
  emergencyFundChoiceFromRunwayMonths,
  isAllowedPrefillQuestionId,
  isNeverPrefillQuestionId,
  observeDashboardPrefill,
  observeLinkedPrefill,
  questionSuggestionsFromMoney,
} from "@/lib/finance/observed-prefill";

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

describe("observed prefill — transfers are not income", () => {
  it("excludes TRANSFER_IN from inflows and never marks verified", () => {
    const suggestion = observeLinkedPrefill(
      [
        { amount: -4000, pending: false, txnDate: iso(40), category: "INCOME" },
        { amount: -2000, pending: false, txnDate: iso(20), category: "TRANSFER_IN" },
        { amount: 800, pending: false, txnDate: iso(10), category: "LOAN_PAYMENTS" },
        { amount: 500, pending: false, txnDate: iso(5), category: "FOOD_AND_DRINK" },
      ],
      [{ type: "depository", availableBalance: 12000 }],
    );

    expect(suggestion.canVerify).toBe(false);
    expect(suggestion.transferClassificationSafe).toBe(true);
    expect(suggestion.monthlyInflows).toBeGreaterThan(0);
    expect(suggestion.suggestedDti).not.toBeNull();
    // Transfer must not inflate income. 4000 over ~40d ≈ 3000/mo, not 6000.
    expect(suggestion.monthlyInflows).toBeLessThan(4500);
  });

  it("uncategorized money-in is not treated as income and stays unverified", () => {
    const suggestion = observeLinkedPrefill(
      [
        { amount: -3000, pending: false, txnDate: iso(31), category: null },
        { amount: 400, pending: false, txnDate: iso(2), category: "LOAN_PAYMENTS" },
      ],
      [{ type: "depository", currentBalance: 8000 }],
    );

    expect(suggestion.canVerify).toBe(false);
    expect(suggestion.transferClassificationSafe).toBe(false);
    expect(suggestion.suggestedDti).toBeNull();
    expect(suggestion.monthlyInflows).toBe(0);
  });
});

describe("dashboard prefill — live IDs only", () => {
  it("maps income, debt, savings, nearest EF choice, and DP earmark", () => {
    const suggestions = questionSuggestionsFromMoney({
      monthlyIncome: 8000,
      monthlyDebtPayments: 1600,
      liquidSavings: 24000,
      monthlyExpenses: 4000,
      runwayMonths: 6,
      earmarkedDownPayment: 40000,
      homeTarget: 200000,
    });
    expect(suggestions.fin_income).toBe(8000);
    expect(suggestions.fin_debt_payments).toBe(1600);
    expect(suggestions.fin_savings_total).toBe(24000);
    expect(suggestions.fin_emergency_fund).toBe("6_plus");
    expect(suggestions.fin_down_payment).toBe("20_plus");
  });

  it("does not invent fin_expenses or a down-payment percent without a target", () => {
    const suggestions = questionSuggestionsFromMoney({
      monthlyIncome: 5000,
      monthlyDebtPayments: 0,
      liquidSavings: 1000,
      monthlyExpenses: 3000,
      runwayMonths: 0.3,
      earmarkedDownPayment: 8000,
      homeTarget: null,
    });
    expect(suggestions).not.toHaveProperty("fin_expenses");
    expect(suggestions.fin_down_payment).toBeNull();
    expect(suggestions.fin_emergency_fund).toBe("none");
    expect(downPaymentChoiceFromEarmark(8000, null)).toBeNull();
  });

  it("never allows credit, ET, PT, or fin_dti_ratio", () => {
    expect(isAllowedPrefillQuestionId("fin_income")).toBe(true);
    expect(isAllowedPrefillQuestionId("fin_down_payment")).toBe(true);
    expect(isAllowedPrefillQuestionId("fin_emergency_fund")).toBe(true);
    expect(isNeverPrefillQuestionId("fin_credit_score")).toBe(true);
    expect(isNeverPrefillQuestionId("fin_dti_ratio")).toBe(true);
    expect(isNeverPrefillQuestionId("emo_confidence")).toBe(true);
    expect(isNeverPrefillQuestionId("tim_urgency")).toBe(true);
    expect(isAllowedPrefillQuestionId("fin_dti_ratio")).toBe(false);
  });

  it("picks the nearest live emergency-fund choice from runway", () => {
    expect(emergencyFundChoiceFromRunwayMonths(6)).toBe("6_plus");
    expect(emergencyFundChoiceFromRunwayMonths(4)).toBe("4_5");
    expect(emergencyFundChoiceFromRunwayMonths(2)).toBe("2_3");
    expect(emergencyFundChoiceFromRunwayMonths(1)).toBe("1");
    expect(emergencyFundChoiceFromRunwayMonths(0.4)).toBe("none");
  });

  it("keeps canVerify false on dashboard suggestions", () => {
    const observed = observeDashboardPrefill({
      monthlyIncome: 7000,
      monthlyDebtPayments: 500,
      liquidSavings: 9000,
      monthlyExpenses: 3000,
      runwayMonths: 3,
      earmarkedDownPayment: null,
      homeTarget: null,
    });
    expect(observed.canVerify).toBe(false);
    expect(observed.fin_income).toBe(7000);
  });
});
