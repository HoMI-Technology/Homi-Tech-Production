/**
 * Budget & Runway — deterministic period calculations (PR 1).
 *
 * Every number the Budget UI or the readiness layer shows comes from a
 * pure function in this file. No React, no persistence, no clock reads —
 * "today" is always a parameter so the same inputs always produce the
 * same outputs (and tests never flake on month boundaries).
 *
 * Vocabulary (each is a distinct number, never a vague "remaining"):
 *   income          — posted income transactions in the period
 *   netExpenses     — posted expenses minus posted refunds
 *   cashRemaining   — income − netExpenses
 *   goalReserve     — cash the user intentionally assigned to goals
 *   freeCash        — cashRemaining − goalReserve
 *   categoryRemaining — planned − actual, per category
 */

import { sumCents, type MoneyCents } from "@/lib/finance/money";
import type {
  BudgetCategoryAllocation,
  BudgetPeriod,
  FinanceTransaction,
} from "@/lib/finance/ledger";

/* ------------------------------------------------------------------ */
/* Inclusion predicates                                                */
/* ------------------------------------------------------------------ */

/**
 * Date-only membership test. YYYY-MM-DD strings compare correctly as
 * strings, which keeps budget months anchored to the user's calendar
 * rather than a UTC timestamp's.
 */
export function isInPeriod(
  tx: Pick<FinanceTransaction, "transactionDate">,
  period: Pick<BudgetPeriod, "periodStart" | "periodEnd">,
): boolean {
  return (
    tx.transactionDate >= period.periodStart &&
    tx.transactionDate <= period.periodEnd
  );
}

type CountableTx = Pick<
  FinanceTransaction,
  "type" | "status" | "deletedAt" | "isExcludedFromBudget"
>;

/** Alive = not soft-deleted and not voided. */
function isAlive(tx: CountableTx): boolean {
  return tx.deletedAt === null && tx.status !== "voided";
}

/** Posted income counts toward the period's income. */
export function countsAsIncome(tx: CountableTx): boolean {
  return (
    tx.type === "income" && tx.status === "posted" && isAlive(tx)
  );
}

/** Posted, non-excluded expenses count toward spending. */
export function countsAsSpending(tx: CountableTx): boolean {
  return (
    tx.type === "expense" &&
    tx.status === "posted" &&
    !tx.isExcludedFromBudget &&
    isAlive(tx)
  );
}

/** Posted, non-excluded refunds reduce net spending. */
export function countsAsRefund(tx: CountableTx): boolean {
  return (
    tx.type === "refund" &&
    tx.status === "posted" &&
    !tx.isExcludedFromBudget &&
    isAlive(tx)
  );
}

/* ------------------------------------------------------------------ */
/* Period aggregates                                                   */
/* ------------------------------------------------------------------ */

export interface PeriodTotals {
  incomeCents: MoneyCents;
  /** Gross posted expenses before refunds. */
  grossExpenseCents: MoneyCents;
  refundCents: MoneyCents;
  /** grossExpense − refunds. Can go negative when a refund lands in a
   * month after its purchase; callers must present that as a net
   * adjustment, not negative spending. */
  netExpenseCents: MoneyCents;
  cashRemainingCents: MoneyCents;
  goalReserveCents: MoneyCents;
  freeCashCents: MoneyCents;
  /** Pending rows are disclosed, never silently counted. */
  pendingCount: number;
  uncategorizedCount: number;
}

/**
 * Transfers and adjustments never appear in income or spending — moving
 * $500 to savings is not $500 of spending, and a credit-card payment must
 * not double-count the purchases already on the ledger.
 */
export function summarizePeriod(
  transactions: readonly FinanceTransaction[],
  period: Pick<BudgetPeriod, "periodStart" | "periodEnd" | "goalReserveCents">,
): PeriodTotals {
  const inPeriod = transactions.filter((tx) => isInPeriod(tx, period));

  const incomeCents = sumCents(
    inPeriod.filter(countsAsIncome).map((tx) => tx.amountCents),
  );
  const grossExpenseCents = sumCents(
    inPeriod.filter(countsAsSpending).map((tx) => tx.amountCents),
  );
  const refundCents = sumCents(
    inPeriod.filter(countsAsRefund).map((tx) => tx.amountCents),
  );

  const netExpenseCents = grossExpenseCents - refundCents;
  const cashRemainingCents = incomeCents - netExpenseCents;
  const goalReserveCents = period.goalReserveCents;

  const pendingCount = inPeriod.filter(
    (tx) => tx.status === "pending" && tx.deletedAt === null,
  ).length;
  const uncategorizedCount = inPeriod.filter(
    (tx) =>
      (countsAsSpending(tx) || countsAsRefund(tx)) && tx.categoryId === null,
  ).length;

  return {
    incomeCents,
    grossExpenseCents,
    refundCents,
    netExpenseCents,
    cashRemainingCents,
    goalReserveCents,
    freeCashCents: cashRemainingCents - goalReserveCents,
    pendingCount,
    uncategorizedCount,
  };
}

/* ------------------------------------------------------------------ */
/* Category plan vs. actual                                            */
/* ------------------------------------------------------------------ */

export interface CategoryActual {
  /** Null key groups uncategorized spending into its own row. */
  categoryId: string | null;
  actualCents: MoneyCents;
  plannedCents: MoneyCents | null;
  remainingCents: MoneyCents | null;
  /**
   * actual ÷ planned. Null when nothing is planned — a zero-plan category
   * with spending is "unplanned spending", not "Infinity% used".
   */
  utilization: number | null;
}

/**
 * Net actual per category (expenses − refunds), joined against the
 * period's planned allocations. Planned categories with no spending still
 * appear (actual 0); spending in unplanned categories appears with a null
 * plan.
 */
export function categoryActuals(
  transactions: readonly FinanceTransaction[],
  period: Pick<BudgetPeriod, "periodStart" | "periodEnd">,
  allocations: readonly Pick<
    BudgetCategoryAllocation,
    "categoryId" | "plannedCents"
  >[],
): CategoryActual[] {
  const actualByCategory = new Map<string | null, number>();

  for (const tx of transactions) {
    if (!isInPeriod(tx, period)) continue;
    let signed: number;
    if (countsAsSpending(tx)) signed = tx.amountCents;
    else if (countsAsRefund(tx)) signed = -tx.amountCents;
    else continue;
    actualByCategory.set(
      tx.categoryId,
      (actualByCategory.get(tx.categoryId) ?? 0) + signed,
    );
  }

  const plannedByCategory = new Map<string, number>();
  for (const allocation of allocations) {
    plannedByCategory.set(
      allocation.categoryId,
      (plannedByCategory.get(allocation.categoryId) ?? 0) +
        allocation.plannedCents,
    );
  }

  const categoryIds = new Set<string | null>([
    ...actualByCategory.keys(),
    ...plannedByCategory.keys(),
  ]);

  const rows: CategoryActual[] = [];
  for (const categoryId of categoryIds) {
    const actualCents = actualByCategory.get(categoryId) ?? 0;
    const plannedCents =
      categoryId !== null ? plannedByCategory.get(categoryId) ?? null : null;
    rows.push({
      categoryId,
      actualCents,
      plannedCents,
      remainingCents: plannedCents !== null ? plannedCents - actualCents : null,
      utilization:
        plannedCents !== null && plannedCents > 0
          ? actualCents / plannedCents
          : null,
    });
  }

  // Largest spender first; the uncategorized row keeps its place by size.
  return rows.sort((a, b) => b.actualCents - a.actualCents);
}

/* ------------------------------------------------------------------ */
/* Runway                                                              */
/* ------------------------------------------------------------------ */

export type RunwayBasis =
  | "current_month_actual"
  | "trailing_three_month_average"
  | "user_selected_baseline"
  | "required_obligations_only";

export interface RunwayResult {
  months: number | null;
  basis: RunwayBasis;
  monthlyOutflowCents: MoneyCents;
}

/**
 * Runway = liquid savings ÷ monthly outflow, with the basis always named
 * ("4.2 months based on your trailing three-month average outflow").
 * Null months means outflow is zero or unknown — never Infinity in copy.
 */
export function runwayFromOutflow(
  liquidSavingsCents: MoneyCents,
  monthlyOutflowCents: MoneyCents,
  basis: RunwayBasis,
): RunwayResult {
  return {
    months:
      monthlyOutflowCents > 0 ? liquidSavingsCents / monthlyOutflowCents : null,
    basis,
    monthlyOutflowCents,
  };
}

/* ------------------------------------------------------------------ */
/* Goal projection                                                     */
/* ------------------------------------------------------------------ */

export interface GoalProjection {
  remainingCents: MoneyCents;
  /** Months of contributions still needed at the planned pace; null when
   * the pace is zero and the goal is unfunded. 0 when already reached. */
  monthsToTarget: number | null;
  /** Contribution needed per month to hit targetDate from `fromDate`;
   * null when the goal has no target date or the date has passed. */
  requiredMonthlyCents: MoneyCents | null;
}

/** Whole months between two YYYY-MM-DD dates, minimum zero. */
function monthsBetween(fromDate: string, toDate: string): number {
  const [fy, fm] = fromDate.split("-").map(Number);
  const [ty, tm] = toDate.split("-").map(Number);
  return Math.max(0, (ty - fy) * 12 + (tm - fm));
}

export function projectGoal(
  goal: {
    targetAmountCents: MoneyCents;
    currentAmountCents: MoneyCents;
    plannedMonthlyContributionCents: MoneyCents;
    targetDate: string | null;
  },
  fromDate: string,
): GoalProjection {
  const remainingCents = Math.max(
    0,
    goal.targetAmountCents - goal.currentAmountCents,
  );

  let monthsToTarget: number | null;
  if (remainingCents === 0) {
    monthsToTarget = 0;
  } else if (goal.plannedMonthlyContributionCents > 0) {
    monthsToTarget = Math.ceil(
      remainingCents / goal.plannedMonthlyContributionCents,
    );
  } else {
    monthsToTarget = null;
  }

  let requiredMonthlyCents: MoneyCents | null = null;
  if (goal.targetDate !== null && remainingCents > 0) {
    const months = monthsBetween(fromDate, goal.targetDate);
    requiredMonthlyCents =
      months > 0 ? Math.ceil(remainingCents / months) : null;
  } else if (remainingCents === 0) {
    requiredMonthlyCents = 0;
  }

  return { remainingCents, monthsToTarget, requiredMonthlyCents };
}
