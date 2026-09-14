/**
 * Budget & Runway — cash-flow forecast (pure).
 *
 * Projects a balance forward from a starting balance using recurring rules
 * (exact dates via expandOccurrences) plus a non-recurring baseline drawn
 * from trailing averages. The baseline is always labeled an estimate, the
 * output carries a completeness grade, and missing inputs produce honest
 * nulls — never zeros presented as data.
 *
 * No I/O, no clock reads — asOfDate and the horizon are parameters.
 */

import type { MoneyCents } from "@/lib/finance/money";
import type { RecurringTransactionRule } from "@/lib/finance/ledger";
import { expandOccurrences, addDays, daysBetween } from "@/lib/finance/recurring";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface TrailingAverages {
  /** Average monthly recorded income, or null when unknown. */
  avgMonthlyIncomeCents: MoneyCents | null;
  /** Average monthly recorded expense, or null when unknown. */
  avgMonthlyExpenseCents: MoneyCents | null;
  /** How many trailing months the averages were computed from. */
  monthsWithData: number;
}

export interface ForecastInput {
  /** Current balance to project from; null = balance unknown. */
  startingBalanceCents: MoneyCents | null;
  recurringRules: readonly RecurringTransactionRule[];
  trailingAverages: TrailingAverages;
  horizonDays: number;
  /** Date-only (YYYY-MM-DD) first day of the projection. */
  asOfDate: string;
}

export interface ForecastLineItem {
  date: string;
  description: string;
  type: "income" | "expense";
  amountCents: MoneyCents;
  /** rule = exact recurring occurrence; estimate = trailing-average baseline. */
  source: "rule" | "estimate";
  ruleId: string | null;
}

export interface ForecastDay {
  date: string;
  balanceCents: MoneyCents;
  items: ForecastLineItem[];
}

export type ForecastCompleteness = "high" | "medium" | "low";

export interface ForecastResult {
  /** Day-by-day projection; null when no starting balance is known. */
  series: ForecastDay[] | null;
  /** Every line item feeding the projection (independent of balance). */
  items: ForecastLineItem[];
  lowestBalanceCents: MoneyCents | null;
  lowestBalanceDate: string | null;
  /** Days from asOfDate until the balance first goes negative; null when it
   * never does within the horizon — never invented. */
  daysUntilNegative: number | null;
  completeness: ForecastCompleteness;
  /** Human-readable provenance label for the UI. */
  disclaimer: string;
  rulesUsed: number;
}

/* ------------------------------------------------------------------ */
/* Cadence → monthly multiplier                                        */
/* ------------------------------------------------------------------ */

/** Occurrences per month for coverage math (rule coverage vs. history). */
export function cadenceMonthlyMultiplier(cadence: RecurringTransactionRule["cadence"]): number {
  switch (cadence) {
    case "weekly":
      return 52 / 12;
    case "biweekly":
      return 26 / 12;
    case "semimonthly":
      return 2;
    case "monthly":
      return 1;
    case "quarterly":
      return 1 / 3;
    case "annual":
      return 1 / 12;
  }
}

/** Sum of rule amounts normalized to a monthly figure, per type. */
export function monthlyRuleTotalCents(
  rules: readonly RecurringTransactionRule[],
  type: "income" | "expense",
): MoneyCents {
  let total = 0;
  for (const rule of rules) {
    if (rule.type !== type || !rule.isActive || rule.deletedAt !== null) continue;
    total += Math.round(rule.amountCents * cadenceMonthlyMultiplier(rule.cadence));
  }
  return total;
}

/* ------------------------------------------------------------------ */
/* forecastCashFlow                                                    */
/* ------------------------------------------------------------------ */

/**
 * Projects the balance day-by-day across the horizon.
 *
 * - Recurring rules contribute exact line items on their occurrence dates.
 * - The non-recurring baseline (trailing average minus the portion already
 *   covered by rules, floored at zero) is spread weekly and labeled
 *   `source: "estimate"` so the UI can render it distinctly.
 * - completeness grades how much of recorded spend the rules cover:
 *   high = 3+ months of history and rules cover >=50% of recorded expense;
 *   medium = 2+ months of history or at least one rule; low otherwise.
 */
export function forecastCashFlow(input: ForecastInput): ForecastResult {
  const horizonDays = Math.max(1, Math.trunc(input.horizonDays));
  const fromDate = input.asOfDate;
  const toDate = addDays(fromDate, horizonDays - 1);

  const activeRules = input.recurringRules.filter(
    (rule) => rule.isActive && rule.deletedAt === null,
  );

  const items: ForecastLineItem[] = [];
  for (const rule of activeRules) {
    for (const date of expandOccurrences(rule, fromDate, toDate)) {
      items.push({
        date,
        description: rule.description,
        type: rule.type,
        amountCents: rule.amountCents,
        source: "rule",
        ruleId: rule.id,
      });
    }
  }

  // Non-recurring baseline: recorded average minus what rules already cover.
  const { avgMonthlyIncomeCents, avgMonthlyExpenseCents, monthsWithData } =
    input.trailingAverages;
  const ruleIncomeMonthly = monthlyRuleTotalCents(activeRules, "income");
  const ruleExpenseMonthly = monthlyRuleTotalCents(activeRules, "expense");
  const baselineIncomeMonthly =
    avgMonthlyIncomeCents !== null ? Math.max(0, avgMonthlyIncomeCents - ruleIncomeMonthly) : null;
  const baselineExpenseMonthly =
    avgMonthlyExpenseCents !== null
      ? Math.max(0, avgMonthlyExpenseCents - ruleExpenseMonthly)
      : null;

  // Weekly buckets keep the item list small and the estimate visibly coarse.
  const weeklyIncomeCents =
    baselineIncomeMonthly !== null ? Math.round((baselineIncomeMonthly * 12) / 52) : null;
  const weeklyExpenseCents =
    baselineExpenseMonthly !== null ? Math.round((baselineExpenseMonthly * 12) / 52) : null;

  for (let offset = 0; offset < horizonDays; offset += 7) {
    const date = addDays(fromDate, offset);
    if (weeklyIncomeCents !== null && weeklyIncomeCents > 0) {
      items.push({
        date,
        description: "Estimated non-recurring income (trailing average)",
        type: "income",
        amountCents: weeklyIncomeCents,
        source: "estimate",
        ruleId: null,
      });
    }
    if (weeklyExpenseCents !== null && weeklyExpenseCents > 0) {
      items.push({
        date,
        description: "Estimated non-recurring spending (trailing average)",
        type: "expense",
        amountCents: weeklyExpenseCents,
        source: "estimate",
        ruleId: null,
      });
    }
  }

  items.sort((a, b) => a.date.localeCompare(b.date));

  // Completeness: rule coverage vs. historical spend + depth of history.
  const expenseCoverage =
    avgMonthlyExpenseCents !== null && avgMonthlyExpenseCents > 0
      ? Math.min(1, ruleExpenseMonthly / avgMonthlyExpenseCents)
      : 0;
  const completeness: ForecastCompleteness =
    monthsWithData >= 3 && expenseCoverage >= 0.5
      ? "high"
      : monthsWithData >= 2 || activeRules.length > 0
        ? "medium"
        : "low";

  const rulesUsed = activeRules.length;
  const disclaimer = `Projection based on ${rulesUsed} recurring rule${rulesUsed === 1 ? "" : "s"} and ${monthsWithData} month${monthsWithData === 1 ? "" : "s"} of recorded history. Estimates use trailing averages and are not predictions.`;

  if (input.startingBalanceCents === null) {
    return {
      series: null,
      items,
      lowestBalanceCents: null,
      lowestBalanceDate: null,
      daysUntilNegative: null,
      completeness,
      disclaimer,
      rulesUsed,
    };
  }

  const itemsByDate = new Map<string, ForecastLineItem[]>();
  for (const item of items) {
    const list = itemsByDate.get(item.date);
    if (list) list.push(item);
    else itemsByDate.set(item.date, [item]);
  }

  const series: ForecastDay[] = [];
  let balance = input.startingBalanceCents;
  let lowestBalanceCents: MoneyCents | null = null;
  let lowestBalanceDate: string | null = null;
  let daysUntilNegative: number | null = null;

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const date = addDays(fromDate, offset);
    const dayItems = itemsByDate.get(date) ?? [];
    for (const item of dayItems) {
      balance += item.type === "income" ? item.amountCents : -item.amountCents;
    }
    series.push({ date, balanceCents: balance, items: dayItems });
    if (lowestBalanceCents === null || balance < lowestBalanceCents) {
      lowestBalanceCents = balance;
      lowestBalanceDate = date;
    }
    if (daysUntilNegative === null && balance < 0) {
      daysUntilNegative = daysBetween(fromDate, date);
    }
  }

  return {
    series,
    items,
    lowestBalanceCents,
    lowestBalanceDate,
    daysUntilNegative,
    completeness,
    disclaimer,
    rulesUsed,
  };
}

/* ------------------------------------------------------------------ */
/* Safe to spend (evolution of the blind-budget concept)               */
/* ------------------------------------------------------------------ */

/**
 * readyToAssign − upcoming obligations − buffer, floored at zero.
 *
 * Returns null when the inputs cannot support a number (non-integer
 * amounts, negative buffer, or obligations unknown) — an honest "unknown"
 * instead of false precision. A negative readyToAssign is a known fact
 * (over-assigned), so it yields 0, not null.
 */
export function safeToSpendCents(
  readyToAssignCents: MoneyCents,
  upcomingObligationsCents: readonly MoneyCents[] | null,
  bufferCents: MoneyCents,
): MoneyCents | null {
  if (!Number.isSafeInteger(readyToAssignCents)) return null;
  if (!Number.isSafeInteger(bufferCents) || bufferCents < 0) return null;
  if (upcomingObligationsCents === null) return null;
  let obligations = 0;
  for (const cents of upcomingObligationsCents) {
    if (!Number.isSafeInteger(cents) || cents < 0) return null;
    obligations += cents;
  }
  return Math.max(0, readyToAssignCents - obligations - bufferCents);
}
