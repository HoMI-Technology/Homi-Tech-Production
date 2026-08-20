import { describe, expect, it } from "vitest";
import {
  MONEY_PREFILL_BANNER,
  applyConfirmedFinancePrefill,
  applyConfirmedQuestionPrefill,
  buildConfirmedFinancePrefill,
  moneyPrefillWasApplied,
  sanitizeSuggestedResponses,
} from "@/lib/finance/prefill-confirm";
import type { AssessmentInputs } from "@/lib/scoring/public";

function baseInputs(): AssessmentInputs {
  return {
    debtToIncomeRatio: 0.4,
    downPaymentPercent: 0.1,
    emergencyFundMonths: 2,
    creditScore: 650,
    creditScoreProvenance: "band_ignored",
    selfReportedCreditBand: "fair",
    lifeStability: 5,
    confidenceLevel: 5,
    partnerAlignment: null,
    fomoLevel: 5,
    timeHorizonMonths: 9,
    savingsRate: 0.08,
    downPaymentProgress: 0.5,
  };
}

describe("prefill confirm — self_report only", () => {
  it("confirm writes self_report and never flips verified", () => {
    const confirmed = buildConfirmedFinancePrefill({
      lookbackDays: 40,
      suggestions: {
        fin_income: 8000,
        fin_debt_payments: 1600,
        fin_savings_total: 20000,
        fin_emergency_fund: "2_3",
        fin_down_payment: "10_14",
      },
      earmarkedDownPayment: 20000,
    });
    expect(confirmed.dtiVerified).toBe(false);
    expect(confirmed.runwayVerified).toBe(false);
    expect(confirmed.dtiPresent).toBe(true);
    expect(confirmed.suggestedResponses?.fin_income).toBe(8000);
    expect(
      confirmed.suggestedResponses && "fin_dti_ratio" in confirmed.suggestedResponses,
    ).toBe(false);

    const overlaid = applyConfirmedFinancePrefill(baseInputs());
    // No stored confirm in this unit — overlay is identity without localStorage.
    expect(overlaid.dtiProvenance ?? "self_report").toBe("self_report");
  });

  it("question prefill keeps live IDs and strips ET / PT / credit / dti_ratio", () => {
    const confirmed = buildConfirmedFinancePrefill({
      lookbackDays: 30,
      suggestions: {
        fin_income: 6000,
        fin_debt_payments: 900,
        fin_savings_total: 12000,
        fin_emergency_fund: "4_5",
        fin_down_payment: "15_19",
      },
    });
    const poisoned = sanitizeSuggestedResponses({
      ...confirmed.suggestedResponses,
      fin_credit_score: "excellent",
      fin_dti_ratio: "20_28",
      emo_confidence: 9,
      tim_urgency: 8,
      fin_expenses: 3000,
    });
    const poisonedRecord = (poisoned ?? {}) as Record<string, unknown>;
    expect(poisonedRecord.fin_credit_score).toBeUndefined();
    expect(poisonedRecord.fin_dti_ratio).toBeUndefined();
    expect(poisonedRecord.emo_confidence).toBeUndefined();
    expect(poisonedRecord.tim_urgency).toBeUndefined();
    expect(poisonedRecord.fin_expenses).toBeUndefined();
    expect(poisoned?.fin_income).toBe(6000);

    const responses = applyConfirmedQuestionPrefill(
      { fin_credit_score: "good", fin_dti_ratio: "over_43", emo_confidence: 4 },
      { ...confirmed, suggestedResponses: poisoned },
    );
    expect(responses.fin_income).toBe(6000);
    expect(responses.fin_debt_payments).toBe(900);
    expect(responses.fin_savings_total).toBe(12000);
    expect(responses.fin_emergency_fund).toBe("4_5");
    expect(responses.fin_down_payment).toBe("15_19");
    expect(responses.fin_credit_score).toBe("good");
    expect(responses.fin_dti_ratio).toBeUndefined();
    expect(responses.emo_confidence).toBe(4);
  });

  it("retake banner only when Money actually filled a blank financial ID", () => {
    expect(MONEY_PREFILL_BANNER).toBe(
      "We pre-filled your financial numbers from Money. Review them, then the rest.",
    );
    expect(moneyPrefillWasApplied({}, {})).toBe(false);
    expect(moneyPrefillWasApplied({}, { fin_income: 6000 })).toBe(true);
    expect(
      moneyPrefillWasApplied({ fin_income: 5000 }, { fin_income: 5000, fin_debt_payments: 900 }),
    ).toBe(true);
    expect(
      moneyPrefillWasApplied(
        { fin_income: 5000, fin_debt_payments: 900 },
        { fin_income: 5000, fin_debt_payments: 900 },
      ),
    ).toBe(false);
  });
});
