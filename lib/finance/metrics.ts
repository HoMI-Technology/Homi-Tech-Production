/**
 * Money Reality — named metric definitions (single import surface).
 *
 * Stand, CFM, Path, and Companion must derive surplus / runway / DTI from
 * these pure functions so three UIs cannot invent three "honest" numbers.
 * Policy lives here; React components only display.
 *
 * Monzo-style lesson: name the metric, don't re-sum ad hoc per surface.
 */

import type { BudgetLedgerState } from "@/lib/finance/local-ledger";
import { activeGoal } from "@/lib/finance/local-ledger";
import { summarizePeriod, runwayFromOutflow, type PeriodTotals } from "@/lib/finance/calculations";
import {
  currentOpenPeriod,
  monthlyIncomeCents,
  debtPaymentsCents,
} from "@/lib/advisor/finance-context";
import { centsToDollars, type MoneyCents } from "@/lib/finance/money";
import { gradeCompleteness, type FinanceCompleteness } from "@/lib/finance/readiness-snapshot";
import type { FinanceState } from "@/lib/finance/store";
import {
  netCashFlow as legacyNetCashFlow,
  runwayMonths as legacyRunwayMonths,
  debtToIncome as legacyDebtToIncome,
  savingsRate as legacySavingsRate,
} from "@/lib/finance/store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LiquidSource = "emergency_goal" | "goal_proxy" | "legacy_snapshot" | "missing";

export type MoneyMetricSource = "ledger" | "legacy";

export interface PeriodSurplus {
  /** Whole dollars for display / CFM boundary. */
  dollars: number;
  incomeDollars: number;
  expenseDollars: number;
  debtPaymentDollars: number;
  formula: "income - netExpense - debtPayments";
}

export interface RunwayMetric {
  months: number | null;
  liquidDollars: number | null;
  liquidSource: LiquidSource;
  monthlyOutflowDollars: number;
}

export interface DtiMetric {
  /** null when income or debt service is unknown — never invent 0% DTI. */
  pct: number | null;
  incomeDollars: number | null;
  debtPaymentDollars: number | null;
}

export interface MoneyEvidence {
  completeness: FinanceCompleteness;
  sourceMode: "manual" | "linked" | "mixed";
  monthsWithData: number;
  uncategorizedCount: number;
  pendingTransactionCount: number;
  latestTransactionDate: string | null;
  hasIncome: boolean;
  hasExpenses: boolean;
  hasDebtSignal: boolean;
  liquidSource: LiquidSource;
}

export interface NamedMoneyMetrics {
  source: MoneyMetricSource;
  asOf: string | null;
  surplus: PeriodSurplus;
  runway: RunwayMetric;
  dti: DtiMetric;
  savingsRatePct: number | null;
  evidence: MoneyEvidence;
  periodTotals: PeriodTotals | null;
}

// ---------------------------------------------------------------------------
// Pure metric definitions
// ---------------------------------------------------------------------------

export function definePeriodSurplus(input: {
  incomeCents: MoneyCents;
  netExpenseCents: MoneyCents;
  debtPaymentsCents: MoneyCents;
}): PeriodSurplus {
  const incomeDollars = centsToDollars(input.incomeCents);
  const expenseDollars = centsToDollars(Math.max(0, input.netExpenseCents));
  const debtPaymentDollars = centsToDollars(input.debtPaymentsCents);
  return {
    dollars: incomeDollars - expenseDollars - debtPaymentDollars,
    incomeDollars,
    expenseDollars,
    debtPaymentDollars,
    formula: "income - netExpense - debtPayments",
  };
}

export function defineRunwayMonths(input: {
  liquidCents: MoneyCents | null;
  monthlyOutflowCents: MoneyCents;
  liquidSource: LiquidSource;
}): RunwayMetric {
  const monthlyOutflowDollars = centsToDollars(Math.max(0, input.monthlyOutflowCents));
  if (input.liquidCents === null || input.liquidCents <= 0) {
    return {
      months: null,
      liquidDollars: null,
      liquidSource: input.liquidSource === "missing" ? "missing" : input.liquidSource,
      monthlyOutflowDollars,
    };
  }
  if (input.monthlyOutflowCents <= 0) {
    return {
      months: null,
      liquidDollars: centsToDollars(input.liquidCents),
      liquidSource: input.liquidSource,
      monthlyOutflowDollars,
    };
  }
  const result = runwayFromOutflow(
    input.liquidCents,
    input.monthlyOutflowCents,
    "current_month_actual",
  );
  return {
    months:
      result.months !== null && result.months !== undefined
        ? Math.round(result.months * 10) / 10
        : null,
    liquidDollars: centsToDollars(input.liquidCents),
    liquidSource: input.liquidSource,
    monthlyOutflowDollars,
  };
}

export function defineDti(input: {
  incomeCents: MoneyCents | null;
  debtPaymentsCents: MoneyCents | null;
}): DtiMetric {
  if (input.incomeCents === null || input.incomeCents <= 0 || input.debtPaymentsCents === null) {
    return {
      pct: null,
      incomeDollars:
        input.incomeCents !== null && input.incomeCents > 0
          ? centsToDollars(input.incomeCents)
          : null,
      debtPaymentDollars:
        input.debtPaymentsCents !== null ? centsToDollars(input.debtPaymentsCents) : null,
    };
  }
  return {
    pct: (input.debtPaymentsCents / input.incomeCents) * 100,
    incomeDollars: centsToDollars(input.incomeCents),
    debtPaymentDollars: centsToDollars(input.debtPaymentsCents),
  };
}

// ---------------------------------------------------------------------------
// Ledger → named metrics
// ---------------------------------------------------------------------------

function monthKey(dateOnly: string): string {
  return dateOnly.slice(0, 7);
}

function countMonthsWithData(state: BudgetLedgerState): number {
  const months = new Set<string>();
  for (const tx of state.transactions) {
    if (tx.deletedAt !== null || tx.status === "voided") continue;
    if (tx.type !== "income" && tx.type !== "expense") continue;
    months.add(monthKey(tx.transactionDate));
  }
  return months.size;
}

function resolveLiquidFromLedger(state: BudgetLedgerState): {
  cents: MoneyCents | null;
  source: LiquidSource;
} {
  const goal = activeGoal(state);
  if (!goal || goal.currentAmountCents <= 0) {
    return { cents: null, source: "missing" };
  }
  if (goal.goalType === "emergency_reserve") {
    return { cents: goal.currentAmountCents, source: "emergency_goal" };
  }
  // Other goals are a proxy only — never silent "liquid cash".
  return { cents: goal.currentAmountCents, source: "goal_proxy" };
}

/**
 * Builds the full named-metric bundle from a budget ledger.
 * Pure aside from period ensure semantics inside currentOpenPeriod.
 */
export function metricsFromLedger(
  state: BudgetLedgerState,
  nowIso: string,
  asOf: string | null,
): NamedMoneyMetrics {
  const nowDate = nowIso.slice(0, 10);
  const period = currentOpenPeriod(state, nowDate, nowIso);
  const totals = summarizePeriod(state.transactions, period);
  const { incomeCents: modeledIncome, basis: incomeBasis } = monthlyIncomeCents(
    state,
    period,
    nowDate,
  );
  // Prefer this period's actuals for decision math (not diluted 3-month avg).
  const incomeCents =
    incomeBasis === "period_expected"
      ? modeledIncome
      : totals.incomeCents > 0
        ? totals.incomeCents
        : modeledIncome;

  const debtPay = debtPaymentsCents(state.transactions, period);
  const hasDebtCategory = state.transactions.some(
    (tx) =>
      tx.deletedAt === null && tx.status === "posted" && tx.categoryId === "cat-debt-payments",
  );

  const surplus = definePeriodSurplus({
    incomeCents: Math.max(0, incomeCents),
    netExpenseCents: totals.netExpenseCents,
    debtPaymentsCents: debtPay,
  });

  const liquid = resolveLiquidFromLedger(state);
  const outflowCents = Math.max(0, totals.netExpenseCents) + debtPay;
  const runway = defineRunwayMonths({
    liquidCents: liquid.cents,
    monthlyOutflowCents: outflowCents,
    liquidSource: liquid.source,
  });

  const dti = defineDti({
    incomeCents: incomeCents > 0 ? incomeCents : null,
    // Honest missing: no debt-category activity → unknown, not 0% DTI.
    debtPaymentsCents: hasDebtCategory ? debtPay : null,
  });

  const monthsWithData = countMonthsWithData(state);
  const sourceMode: MoneyEvidence["sourceMode"] = state.transactions.some(
    (tx) => tx.source === "plaid",
  )
    ? state.transactions.some((tx) => tx.source === "manual")
      ? "mixed"
      : "linked"
    : "manual";

  const latestTransactionDate =
    state.transactions
      .filter((tx) => tx.deletedAt === null)
      .map((tx) => tx.transactionDate)
      .sort()
      .at(-1) ?? null;

  const evidence: MoneyEvidence = {
    completeness: gradeCompleteness({
      monthsWithData,
      uncategorizedCount: totals.uncategorizedCount,
      expectedRecurringItemsMissing: 0,
      sourceMode,
    }),
    sourceMode,
    monthsWithData,
    uncategorizedCount: totals.uncategorizedCount,
    pendingTransactionCount: totals.pendingCount,
    latestTransactionDate,
    hasIncome: incomeCents > 0,
    hasExpenses: totals.grossExpenseCents > 0,
    hasDebtSignal: hasDebtCategory,
    liquidSource: liquid.source,
  };

  const savingsRatePct =
    incomeCents > 0 ? (surplus.dollars / centsToDollars(incomeCents)) * 100 : null;

  return {
    source: "ledger",
    asOf,
    surplus,
    runway,
    dti,
    savingsRatePct,
    evidence,
    periodTotals: totals,
  };
}

/**
 * Legacy FinanceState → named metrics (migration fallback only).
 */
export function metricsFromLegacy(finance: FinanceState, asOf: string | null): NamedMoneyMetrics {
  const surplusDollars = legacyNetCashFlow(finance);
  const surplus: PeriodSurplus = {
    dollars: surplusDollars,
    incomeDollars: finance.monthlyIncome,
    expenseDollars: finance.monthlyExpenses,
    debtPaymentDollars: finance.monthlyDebtPayments,
    formula: "income - netExpense - debtPayments",
  };
  const runway: RunwayMetric = {
    months: legacyRunwayMonths(finance),
    liquidDollars: finance.liquidSavings,
    liquidSource: "legacy_snapshot",
    monthlyOutflowDollars: finance.monthlyExpenses + finance.monthlyDebtPayments,
  };
  const dtiPct = legacyDebtToIncome(finance);
  const dti: DtiMetric = {
    pct: finance.monthlyIncome > 0 ? dtiPct : null,
    incomeDollars: finance.monthlyIncome > 0 ? finance.monthlyIncome : null,
    debtPaymentDollars: finance.monthlyDebtPayments,
  };
  const hasData =
    finance.monthlyIncome > 0 || finance.monthlyExpenses > 0 || finance.liquidSavings > 0;

  return {
    source: "legacy",
    asOf,
    surplus,
    runway,
    dti,
    savingsRatePct: finance.monthlyIncome > 0 ? legacySavingsRate(finance) : null,
    evidence: {
      completeness: hasData ? "low" : "low",
      sourceMode: "manual",
      monthsWithData: hasData ? 1 : 0,
      uncategorizedCount: 0,
      pendingTransactionCount: 0,
      latestTransactionDate: null,
      hasIncome: finance.monthlyIncome > 0,
      hasExpenses: finance.monthlyExpenses > 0,
      hasDebtSignal: finance.monthlyDebtPayments > 0 || finance.totalDebt > 0,
      liquidSource: finance.liquidSavings > 0 ? "legacy_snapshot" : "missing",
    },
    periodTotals: null,
  };
}

/** UI labels for completeness — never "Live picture" on thin data. */
export function completenessLabel(grade: FinanceCompleteness): string {
  switch (grade) {
    case "high":
      return "Strong picture";
    case "medium":
      return "Partial picture";
    default:
      return "Thin picture";
  }
}

/** Hero label — period surplus, not "free cash" / safe-to-spend. */
export const PERIOD_SURPLUS_LABEL = "Net cash this period";
export const PERIOD_SURPLUS_FORMULA =
  "Income − expenses − debt payments for the open period. Not “safe to spend.”";
