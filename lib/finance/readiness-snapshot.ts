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
import { centsToDollars } from "@/lib/finance/money";
import type { PeriodTotals } from "@/lib/finance/calculations";
import { summarizePeriod, runwayFromOutflow } from "@/lib/finance/calculations";
import type { BudgetLedgerState } from "@/lib/finance/local-ledger";
import { activeGoal } from "@/lib/finance/local-ledger";
import { liquidSavingsCents as liquidSavingsFromGoals } from "@/lib/finance/goal-semantics";
import {
  currentOpenPeriod,
  monthlyIncomeCents,
  debtPaymentsCents,
} from "@/lib/finance/ledger-period";
import type { PathFinanceSnapshot } from "@/lib/readiness/path";

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
    "monthsWithData" | "uncategorizedCount" | "expectedRecurringItemsMissing" | "sourceMode"
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
  if (evidence.monthsWithData >= 2 && evidence.expectedRecurringItemsMissing === 0) {
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

    savingsRatePct: hasIncome ? (totals.cashRemainingCents / totals.incomeCents) * 100 : null,
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

/**
 * Builds the compact finance snapshot the Path to Ready engine consumes.
 *
 * Returns `null` when the ledger has no real data yet (no transactions,
 * periods, or active goal). Money is converted to whole USD at the boundary;
 * the path engine should not receive cents.
 */
export function buildPathFinanceSnapshotFromLedger(
  state: BudgetLedgerState,
  nowDate: string,
): PathFinanceSnapshot | null {
  const hasAnyTransactions = state.transactions.length > 0;
  const hasAnyPeriods = state.periods.length > 0;
  const goal = activeGoal(state);
  if (!goal && !hasAnyTransactions && !hasAnyPeriods) {
    return null;
  }

  // currentOpenPeriod needs an ISO stamp when it creates a missing period.
  // We synthesize one from the date-only input so the function stays pure.
  const nowIso = `${nowDate}T00:00:00.000Z`;
  const period = currentOpenPeriod(state, nowDate, nowIso);
  const totals = summarizePeriod(state.transactions, period);
  const { incomeCents } = monthlyIncomeCents(state, period, nowDate);

  const debtPayments = debtPaymentsCents(state.transactions, period);
  const monthlyExpensesCents = totals.netExpenseCents;
  /**
   * Was `: 0` when there was no emergency-reserve goal, while the advisor path
   * returned null for the same condition — the same question answered two ways,
   * one of them a false claim. Both now ask goal-semantics. Zero here still
   * means "known to be nothing left"; unknown collapses to 0 only at this
   * snapshot's numeric boundary, and completeness carries the truth.
   */
  const liquidSavingsCents = liquidSavingsFromGoals(state.goals) ?? 0;

  const outflowCents = monthlyExpensesCents + debtPayments;
  const runway = runwayFromOutflow(liquidSavingsCents, outflowCents, "current_month_actual");

  return {
    monthlyIncome: centsToDollars(incomeCents),
    netCashFlow: centsToDollars(totals.cashRemainingCents),
    runwayMonths: runway.months !== null ? Math.round(runway.months * 10) / 10 : null,
    monthlyExpenses: centsToDollars(monthlyExpensesCents),
    liquidSavings: centsToDollars(liquidSavingsCents),
    monthlyDebtPayments: centsToDollars(debtPayments),
  };
}
