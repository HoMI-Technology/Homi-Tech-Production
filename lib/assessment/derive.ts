import type { AssessmentInputs } from "@/lib/scoring";
import {
  EMERGENCY_FUND_MONTHS,
  TIME_HORIZON_MONTHS,
  type FullAssessmentForm,
} from "./types";

/**
 * Derives canonical AssessmentInputs (ratios/numbers the engine expects)
 * from the raw natural-unit form state collected in the UI.
 */
export function deriveAssessmentInputs(form: FullAssessmentForm): AssessmentInputs {
  const income = form.monthlyGrossIncome ?? 0;
  const debt = form.monthlyDebtPayments ?? 0;
  const debtToIncomeRatio = income > 0 ? debt / income : 0;

  const price = form.targetHomePrice ?? 0;
  const saved = form.downPaymentSaved ?? 0;
  const downPaymentPercent = price > 0 ? saved / price : 0;
  const twentyPercentGoal = price > 0 ? 0.2 * price : 0;
  const downPaymentProgress =
    twentyPercentGoal > 0 ? Math.min(1, saved / twentyPercentGoal) : 0;

  const emergencyFundMonths = form.emergencyFundChoice
    ? EMERGENCY_FUND_MONTHS[form.emergencyFundChoice]
    : 0;

  const creditScore = form.creditScore ?? 0;

  const partnerAlignment = form.partnered === "yes" ? form.partnerAlignment : null;

  const timeHorizonMonths = form.timeHorizonChoice
    ? TIME_HORIZON_MONTHS[form.timeHorizonChoice]
    : 6;

  const savingsRate = (form.savingsRatePercent ?? 0) / 100;

  const monthlyHousingRatio =
    form.expectedMonthlyHousingPayment && income > 0
      ? form.expectedMonthlyHousingPayment / income
      : undefined;

  return {
    debtToIncomeRatio,
    downPaymentPercent,
    emergencyFundMonths,
    creditScore,
    lifeStability: form.lifeStability,
    confidenceLevel: form.confidenceLevel,
    partnerAlignment,
    fomoLevel: form.fomoLevel,
    timeHorizonMonths,
    savingsRate,
    downPaymentProgress,
    monthlyHousingRatio,
    // Conflict / bias check — carried through for lib/conflict/engine.ts and
    // lib/signals/engine.ts only. computeScore() never reads these.
    referralSource: form.referralSource ?? undefined,
    deadlineOrigin: form.deadlineOrigin ?? undefined,
  };
}
