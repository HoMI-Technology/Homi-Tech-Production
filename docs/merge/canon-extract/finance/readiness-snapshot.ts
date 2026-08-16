/**
 * Budget & Runway — readiness integration contract (PR 1).
 *
 * The budget system exposes verified financial facts and derived signals;
 * the readiness layer applies its existing approved logic to them. Nothing
 * in this file introduces a scoring weight, computes a verdict, or exposes
 * proprietary thresholds — and low-completeness data must reach the
 * readiness layer labeled as such, because missing transactions are not
 * zero spending.
 */

import type { MoneyCents } from "@/lib/finance/money";
import type { PeriodTotals } from "@/lib/finance/calculations";

export type FinanceCompleteness = "low" | "medium" | "high";

export interface FinanceEvidenceSummary {
  sourceMode: "manual" | "linked" | "mixed";
  latestTransactionDate: string | null;
  lastUserReviewAt: string | null;
  monthsWithData: number;
  uncategorizedCount: number;
  pendingTransactionCount: number;
  expectedRecurringItemsMissing: number;
  completeness: FinanceCompleteness;
}

export interface FinanceReadinessSnapshot {
  /** YYYY-MM of the summarized period. */
  period: string;

  actualIncomeCents: MoneyCents;
  expectedIncomeCents: MoneyCents | null;

  netExpenseCents: MoneyCents;
  requiredExpenseCents: MoneyCents;
  flexibleExpenseCents: MoneyCents;

  cashRemainingCents: MoneyCents;
  freeCashCents: MoneyCents;

  savingsRatePct: number | null;
  runwayMonths: number | null;
  debtToIncomePct: number | null;

  activeGoalTargetCents: MoneyCents | null;
  activeGoalMonthlyNeedCents: MoneyCents | null;
  activeGoalMonthlyActualCents: MoneyCents | null;

  completeness: FinanceCompleteness;
  calculatedAt: string;
}

/**
 * Grades how much the current evidence can support. Deterministic and
 * deliberately conservative: one month of manual entries with gaps must
 * read as low so HōMI speaks in planning language, not certainty.
 */
export function gradeCompleteness(
  evidence: Pick<
    FinanceEvidenceSummary,
    | "monthsWithData"
    | "uncategorizedCount"
    | "expectedRecurringItemsMissing"
    | "sourceMode"
  >,
): FinanceCompleteness {
  if (
    evidence.monthsWithData >= 3 &&
    evidence.uncategorizedCount === 0 &&
    evidence.expectedRecurringItemsMissing === 0 &&
    evidence.sourceMode !== "manual"
  ) {
    return "high";
  }
  if (
    evidence.monthsWithData >= 2 &&
    evidence.expectedRecurringItemsMissing === 0
  ) {
    return "medium";
  }
  return "low";
}

/**
 * Assembles the snapshot the readiness layer consumes. All rate fields go
 * null rather than 0 when their denominator is missing — "no income
 * recorded" and "0% savings rate" are different facts.
 */
export function buildReadinessSnapshot(input: {
  period: string;
  totals: PeriodTotals;
  expectedIncomeCents: MoneyCents | null;
  requiredExpenseCents: MoneyCents;
  flexibleExpenseCents: MoneyCents;
  monthlyDebtPaymentsCents: MoneyCents | null;
  runwayMonths: number | null;
  activeGoal: {
    targetAmountCents: MoneyCents;
    requiredMonthlyCents: MoneyCents | null;
    actualMonthlyCents: MoneyCents;
  } | null;
  completeness: FinanceCompleteness;
  calculatedAt: string;
}): FinanceReadinessSnapshot {
  const { totals } = input;
  const hasIncome = totals.incomeCents > 0;

  return {
    period: input.period,

    actualIncomeCents: totals.incomeCents,
    expectedIncomeCents: input.expectedIncomeCents,

    netExpenseCents: totals.netExpenseCents,
    requiredExpenseCents: input.requiredExpenseCents,
    flexibleExpenseCents: input.flexibleExpenseCents,

    cashRemainingCents: totals.cashRemainingCents,
    freeCashCents: totals.freeCashCents,

    savingsRatePct: hasIncome
      ? (totals.cashRemainingCents / totals.incomeCents) * 100
      : null,
    runwayMonths: input.runwayMonths,
    debtToIncomePct:
      hasIncome && input.monthlyDebtPaymentsCents !== null
        ? (input.monthlyDebtPaymentsCents / totals.incomeCents) * 100
        : null,

    activeGoalTargetCents: input.activeGoal?.targetAmountCents ?? null,
    activeGoalMonthlyNeedCents: input.activeGoal?.requiredMonthlyCents ?? null,
    activeGoalMonthlyActualCents: input.activeGoal?.actualMonthlyCents ?? null,

    completeness: input.completeness,
    calculatedAt: input.calculatedAt,
  };
}
