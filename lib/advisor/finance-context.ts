/**
 * Advisor finance context builders — ledger-first with legacy fallback.
 *
 * Pure functions that turn either the v2 BudgetLedgerState or the legacy
 * FinanceState into the AdvisorFinanceContext the Companion consumes. All
 * monetary outputs are whole USD; all calculation inputs are integer cents.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinanceState } from "@/lib/finance/store";
import { centsToDollars } from "@/lib/finance/money";
import type { BudgetPeriod, SavingsGoal } from "@/lib/finance/ledger";
import { activeGoal, type BudgetLedgerState } from "@/lib/finance/local-ledger";
import {
  currentOpenPeriod,
  debtPaymentsCents,
  isAlive,
  isBudgetExpense,
  isBudgetIncome,
  monthFromDate,
  monthlyIncomeCents,
  previousMonths,
} from "@/lib/finance/ledger-period";
// Re-exported for existing importers; the definitions now live in the finance
// layer so lib/finance/metrics.ts no longer has to reach into the advisor.
export { currentOpenPeriod, monthlyIncomeCents, debtPaymentsCents };
import {
  categoryActuals,
  isInPeriod,
  runwayFromOutflow,
  summarizePeriod,
} from "@/lib/finance/calculations";
import type {
  AdvisorFinanceContext,
  FinanceSignal,
  FinanceNudge,
  FinanceGoalSnapshot,
  IncomeVsSpendingPoint,
  RecentTransactionSnapshot,
  SpendingCategorySnapshot,
} from "@/lib/advisor/fallback";
import {
  rowToCategory,
  rowToTransaction,
  FINANCE_LEDGER_INFRA_MISSING,
  type FinanceTransactionRow,
  type FinanceCategoryRow,
} from "@/lib/finance/db-map";
import type { FinanceBudgetPeriodRow, FinanceSavingsGoalRow } from "@/types/database";

/* -------------------------------------------------------------------------- */
/* Legacy store conversion                                                    */
/* -------------------------------------------------------------------------- */

export function buildFinanceContextFromLegacy(
  state: FinanceState,
  savedAt?: string | null,
): AdvisorFinanceContext {
  const net = state.monthlyIncome - state.monthlyExpenses - state.monthlyDebtPayments;
  const savingsRate = state.monthlyIncome > 0 ? (net / state.monthlyIncome) * 100 : 0;
  const outflow = state.monthlyExpenses + state.monthlyDebtPayments;
  const runway = outflow > 0 ? state.liquidSavings / outflow : null;
  const dti = state.monthlyIncome > 0 ? (state.monthlyDebtPayments / state.monthlyIncome) * 100 : 0;
  const assets = state.assets.reduce((s, a) => s + a.amount, 0);
  const liabilities = state.liabilities.reduce((s, l) => s + l.amount, 0);

  return {
    monthlyIncome: Math.round(state.monthlyIncome),
    netCashFlow: Math.round(net),
    savingsRate: Math.round(savingsRate * 10) / 10,
    runwayMonths: runway !== null && Number.isFinite(runway) ? Math.round(runway * 10) / 10 : null,
    dti: Math.round(dti * 10) / 10,
    liquidSavings: Math.round(state.liquidSavings),
    totalDebt: Math.round(state.totalDebt),
    netWorth: Math.round(assets - liabilities),
    ageDays: daysSince(savedAt),
  };
}

/* -------------------------------------------------------------------------- */
/* Ledger conversion                                                          */
/* -------------------------------------------------------------------------- */

function roundCents(cents: number): number {
  return Math.round(centsToDollars(cents));
}

function resolveCategoryName(
  categories: BudgetLedgerState["categories"],
  categoryId: string | null,
): string {
  if (categoryId === null) return "Uncategorized";
  return categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized";
}
function incomeVsSpendingSeries(
  transactions: BudgetLedgerState["transactions"],
  nowDate: string,
  months = 6,
): IncomeVsSpendingPoint[] {
  const targetMonths = previousMonths(nowDate, months);
  const incomeByMonth = new Map<string, number>();
  const expenseByMonth = new Map<string, number>();
  const refundByMonth = new Map<string, number>();

  for (const tx of transactions) {
    const month = monthFromDate(tx.transactionDate);
    if (!targetMonths.includes(month)) continue;
    if (isBudgetIncome(tx)) {
      incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + tx.amountCents);
    } else if (isBudgetExpense(tx)) {
      expenseByMonth.set(month, (expenseByMonth.get(month) ?? 0) + tx.amountCents);
    } else if (
      tx.type === "refund" &&
      tx.status === "posted" &&
      !tx.isExcludedFromBudget &&
      isAlive(tx)
    ) {
      refundByMonth.set(month, (refundByMonth.get(month) ?? 0) + tx.amountCents);
    }
  }

  return targetMonths
    .slice()
    .reverse()
    .map((month) => ({
      month,
      income: Math.round(centsToDollars(incomeByMonth.get(month) ?? 0)),
      spending: Math.round(
        centsToDollars(
          Math.max(0, (expenseByMonth.get(month) ?? 0) - (refundByMonth.get(month) ?? 0)),
        ),
      ),
    }));
}

function topSpendingCategories(
  state: BudgetLedgerState,
  period: Pick<BudgetPeriod, "periodStart" | "periodEnd">,
  incomeCents: number,
  cap = 10,
): SpendingCategorySnapshot[] {
  const actuals = categoryActuals(state.transactions, period, []);
  return actuals
    .filter((a) => a.actualCents > 0)
    .sort((a, b) => b.actualCents - a.actualCents)
    .slice(0, cap)
    .map((a) => ({
      name: resolveCategoryName(state.categories, a.categoryId),
      amount: Math.round(centsToDollars(a.actualCents)),
      pctOfIncome: incomeCents > 0 ? Math.round((a.actualCents / incomeCents) * 1000) / 10 : 0,
      trend: "flat" as const,
    }));
}

function recentTransactions(state: BudgetLedgerState, cap = 20): RecentTransactionSnapshot[] {
  return state.transactions
    .filter(
      (tx) =>
        (tx.type === "income" || tx.type === "expense") && tx.status === "posted" && isAlive(tx),
    )
    .sort((a, b) => {
      if (a.transactionDate !== b.transactionDate) {
        return a.transactionDate > b.transactionDate ? -1 : 1;
      }
      return a.createdAt > b.createdAt ? -1 : 1;
    })
    .slice(0, cap)
    .map((tx) => ({
      date: tx.transactionDate,
      description: tx.description,
      amount: Math.round(centsToDollars(tx.amountCents)),
      category: resolveCategoryName(state.categories, tx.categoryId),
      type: tx.type as "income" | "expense",
    }));
}

function goalSnapshot(goal: SavingsGoal): FinanceGoalSnapshot {
  const pct =
    goal.targetAmountCents > 0
      ? Math.min(100, Math.round((goal.currentAmountCents / goal.targetAmountCents) * 1000) / 10)
      : 0;
  return {
    name: goal.name,
    target: Math.round(centsToDollars(goal.targetAmountCents)),
    saved: Math.round(centsToDollars(goal.currentAmountCents)),
    pct,
    dueDate: goal.targetDate ?? undefined,
  };
}

function buildSignals(ctx: {
  dti: number;
  savingsRate: number;
  runwayMonths: number | null;
  netCashFlow: number;
  monthlyIncome: number;
}): FinanceSignal[] {
  const signals: FinanceSignal[] = [];

  if (ctx.dti > 36) {
    signals.push({
      id: "dti-high",
      severity: ctx.dti > 43 ? "crimson" : "amber",
      title: "Debt payments are eating a lot of your income",
      body: `Your debt-to-income ratio is ${ctx.dti}%, which is above the 36% guardrail. That leaves less room for savings and surprises.`,
    });
  }

  if (ctx.runwayMonths !== null && ctx.runwayMonths < 3) {
    signals.push({
      id: "runway-low",
      severity: ctx.runwayMonths < 1 ? "crimson" : "amber",
      title: "Emergency runway is below 3 months",
      body: `You have about ${ctx.runwayMonths} month${ctx.runwayMonths === 1 ? "" : "s"} of expenses covered by liquid savings. A single surprise could knock you off pace.`,
    });
  }

  if (ctx.savingsRate < 10) {
    signals.push({
      id: "savings-rate-low",
      severity: ctx.savingsRate < 0 ? "crimson" : "amber",
      title: "Savings rate is below 10%",
      body: `You're saving ${ctx.savingsRate}% of income. Under 10% makes big goals slow and fragile.`,
    });
  }

  if (ctx.netCashFlow < 0) {
    signals.push({
      id: "cash-flow-negative",
      severity: "crimson",
      title: "Monthly cash flow is negative",
      body: `You're spending about $${Math.abs(ctx.netCashFlow)} more than you bring in each month. That's not sustainable — the leak has to close before goals accelerate.`,
    });
  }

  return signals;
}

function buildNudges(signals: FinanceSignal[]): FinanceNudge[] {
  const nudges: FinanceNudge[] = [];
  const has = (id: string) => signals.some((s) => s.id === id);

  if (has("dti-high")) {
    nudges.push({
      id: "nudge-debt",
      type: "debt",
      message:
        "Your debt load is the loudest signal right now. Even an extra $50 a month toward the highest-rate payment changes the math faster than cutting small spending.",
      action: { label: "Open debt planner", href: "/tools/debt-payoff" },
    });
  }

  if (has("runway-low") || has("savings-rate-low")) {
    nudges.push({
      id: "nudge-runway",
      type: "savings",
      message:
        "Build the emergency runway first — it's the foundation every other goal stands on. Automate one transfer on payday so it happens before you feel it.",
      action: { label: "Check runway", href: "/tools/runway" },
    });
  }

  if (has("cash-flow-negative")) {
    nudges.push({
      id: "nudge-spending",
      type: "spending",
      message:
        "You're going backwards each month. Pick the two biggest discretionary categories and pause them for 30 days — not forever, just long enough to stop the bleed.",
      action: { label: "Review budget", href: "/money/budget" },
    });
  }

  return nudges.slice(0, 3);
}

export function buildFinanceContextFromLedger(
  state: BudgetLedgerState,
  nowIso: string,
): AdvisorFinanceContext | undefined {
  const nowDate = nowIso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nowDate)) return undefined;

  const goal = activeGoal(state);
  const hasAnyTransactions = state.transactions.length > 0;
  const hasAnyPeriods = state.periods.length > 0;
  if (!goal && !hasAnyTransactions && !hasAnyPeriods) return undefined;

  const period = currentOpenPeriod(state, nowDate, nowIso);
  const totals = summarizePeriod(state.transactions, period);
  const { incomeCents } = monthlyIncomeCents(state, period, nowDate);
  const monthlyIncome = Math.max(0, roundCents(incomeCents || totals.incomeCents));

  const debtPayments = debtPaymentsCents(state.transactions, period);
  const netCashFlow = roundCents(totals.incomeCents - totals.netExpenseCents);

  const savingsRate =
    incomeCents > 0 ? Math.round((totals.goalReserveCents / incomeCents) * 1000) / 10 : 0;

  /**
   * The v1 ledger knows goal balances, not the user's liquid position. With no
   * emergency-reserve goal it simply does not know how much cash they hold, and
   * 0 is not the same as unknown: it divides into monthly outflow to produce a
   * runway of exactly 0 months, which trips the crimson "Emergency runway is
   * below 3 months" signal and is read verbatim into the Companion's prompt.
   * Someone with $25k in a house fund would be told they have nothing.
   *
   * Counting non-reserve goals instead was considered and rejected — earmarked
   * money is not emergency runway, and overstating it is the opposite error.
   */
  const liquidSavingsCents =
    goal?.goalType === "emergency_reserve" ? goal.currentAmountCents : null;
  const liquidSavings = liquidSavingsCents === null ? null : roundCents(liquidSavingsCents);
  /**
   * The v1 ledger has no liability transaction type, so it cannot know what the
   * user owes — and without liabilities there is no net worth to report either.
   * These stay null ("unknown") rather than 0: the Companion renders them into
   * its prompt and the dashboard renders netWorth into the "Net worth" tile, so
   * a zero here becomes a confident false statement on both surfaces.
   */
  const totalDebt = null;
  const netWorth = null;

  const runwayResult =
    liquidSavingsCents === null
      ? null
      : runwayFromOutflow(liquidSavingsCents, totals.netExpenseCents, "current_month_actual");
  const runwayMonths =
    runwayResult && runwayResult.months !== null ? Math.round(runwayResult.months * 10) / 10 : null;

  const dti = monthlyIncome > 0 ? Math.round((debtPayments / incomeCents) * 1000) / 10 : 0;

  const activeSignals = buildSignals({
    dti,
    savingsRate,
    runwayMonths,
    netCashFlow,
    monthlyIncome,
  });
  const nudges = buildNudges(activeSignals);

  const series = incomeVsSpendingSeries(state.transactions, nowDate, 6);
  const categories = topSpendingCategories(state, period, incomeCents || totals.incomeCents, 10);
  const transactions = recentTransactions(state, 20);

  const downPaymentProgressPct =
    goal?.goalType === "home" && goal.targetAmountCents > 0
      ? Math.min(100, Math.round((goal.currentAmountCents / goal.targetAmountCents) * 1000) / 10)
      : 0;

  return {
    monthlyIncome,
    netCashFlow,
    savingsRate,
    runwayMonths,
    dti,
    liquidSavings,
    totalDebt,
    netWorth,
    topSpendingCategories: categories,
    incomeVsSpendingSeries: series,
    activeSignals,
    nudges,
    goals: goal ? [goalSnapshot(goal)] : [],
    recentTransactions: transactions,
    readinessInputs: {
      dti,
      savingsRate,
      // Not `?? 0` — that reintroduces the false zero this whole path avoids.
      runwayMonths,
      downPaymentProgressPct,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Server-side ledger table assembly                                          */
/* -------------------------------------------------------------------------- */

export async function buildFinanceContextFromLedgerTables(
  supabase: SupabaseClient,
): Promise<AdvisorFinanceContext | null> {
  const nowIso = new Date().toISOString();

  try {
    const [
      { data: txRows, error: txError },
      { data: catRows, error: catError },
      { data: periodRows, error: periodError },
      { data: goalRows, error: goalError },
    ] = await Promise.all([
      supabase
        .from("finance_transactions")
        .select(
          "id, user_id, type, status, amount_cents, currency, description, merchant_name, category_id, account_id, transaction_date, posted_at, source, external_transaction_id, recurring_rule_id, transfer_group_id, parent_transaction_id, is_excluded_from_budget, user_note, created_at, updated_at, deleted_at",
        )
        .order("transaction_date", { ascending: false }),
      supabase
        .from("finance_categories")
        .select(
          "id, user_id, name, slug, category_type, essentiality, parent_category_id, is_system, is_archived, created_at, updated_at",
        ),
      supabase
        .from("finance_budget_periods")
        .select(
          "id, user_id, period_start, period_end, expected_income_cents, goal_reserve_cents, status, created_at, updated_at",
        )
        .order("period_start", { ascending: false })
        .limit(24),
      supabase
        .from("finance_savings_goals")
        .select(
          "id, user_id, name, goal_type, target_amount_cents, current_amount_cents, target_date, planned_monthly_contribution_cents, linked_decision_id, linked_account_id, status, created_at, updated_at",
        )
        .eq("status", "active")
        .limit(1)
        .maybeSingle(),
    ]);

    if (txError?.code && FINANCE_LEDGER_INFRA_MISSING.has(txError.code)) return null;
    if (catError?.code && FINANCE_LEDGER_INFRA_MISSING.has(catError.code)) return null;
    if (periodError?.code && FINANCE_LEDGER_INFRA_MISSING.has(periodError.code)) return null;
    if (goalError?.code && FINANCE_LEDGER_INFRA_MISSING.has(goalError.code)) return null;

    const hasAnyData =
      (txRows && txRows.length > 0) || (periodRows && periodRows.length > 0) || goalRows;
    if (!hasAnyData) return null;

    const state: BudgetLedgerState = {
      schemaVersion: 1,
      transactions: ((txRows ?? []) as FinanceTransactionRow[]).map(rowToTransaction),
      categories: ((catRows ?? []) as FinanceCategoryRow[]).map(rowToCategory),
      periods: ((periodRows ?? []) as FinanceBudgetPeriodRow[]).map((r) => ({
        id: r.id,
        userId: r.user_id,
        periodStart: r.period_start,
        periodEnd: r.period_end,
        expectedIncomeCents:
          r.expected_income_cents === null
            ? null
            : (Number(r.expected_income_cents) as BudgetPeriod["expectedIncomeCents"]),
        goalReserveCents: Number(r.goal_reserve_cents),
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      allocations: [],
      goal: goalRows
        ? {
            id: goalRows.id,
            userId: goalRows.user_id,
            name: goalRows.name,
            goalType: goalRows.goal_type,
            targetAmountCents: Number(goalRows.target_amount_cents),
            currentAmountCents: Number(goalRows.current_amount_cents),
            targetDate: goalRows.target_date,
            plannedMonthlyContributionCents: Number(goalRows.planned_monthly_contribution_cents),
            linkedDecisionId: goalRows.linked_decision_id,
            linkedAccountId: goalRows.linked_account_id,
            status: goalRows.status,
            createdAt: goalRows.created_at,
            updatedAt: goalRows.updated_at,
          }
        : null,
    };

    return buildFinanceContextFromLedger(state, nowIso) ?? null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

const MAX_PLAUSIBLE_AGE_DAYS = 3650;
function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days < 0 || days > MAX_PLAUSIBLE_AGE_DAYS) return null;
  return days;
}
