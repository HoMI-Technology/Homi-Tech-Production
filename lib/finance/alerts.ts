/**
 * Budget & Runway — budget alerts (pure).
 *
 * Derives neutral, educational alert objects from envelope state, recurring
 * rules, a cash-flow forecast, and runway. Alerts state recorded facts and
 * projections ("has passed its assigned amount", "is scheduled") — never
 * advice ("you should"), never certainty claims.
 *
 * Every alert carries a dedupeKey so persisting layers can upsert without
 * duplicating undismissed alerts across re-runs.
 *
 * No I/O, no clock reads — asOfDate and the period are parameters.
 */

import type { MoneyCents } from "@/lib/finance/money";
import { formatCentsUSD } from "@/lib/finance/money";
import type { BudgetPeriod, RecurringTransactionRule } from "@/lib/finance/ledger";
import type { EnvelopeCategoryState } from "@/lib/finance/envelope";
import type { RunwayResult } from "@/lib/finance/calculations";
import type { ForecastResult } from "@/lib/finance/forecast";
import { nextOccurrence, normalizePayee, recurringGenerationKey } from "@/lib/finance/recurring";

export type BudgetAlertKind =
  | "overspend"
  | "bill_due"
  | "low_runway"
  | "uncategorized_backlog"
  | "rule_conflict";

export type BudgetAlertSeverity = "emerald" | "yellow" | "amber" | "crimson";

export interface BudgetAlert {
  kind: BudgetAlertKind;
  severity: BudgetAlertSeverity;
  categoryId?: string;
  ruleId?: string;
  amountCents?: MoneyCents;
  title: string;
  /** Neutral, educational wording. */
  message: string;
  /** Stable identity for upsert/dedupe across re-runs. */
  dedupeKey: string;
}

export interface BudgetAlertInput {
  period: Pick<BudgetPeriod, "id" | "periodStart" | "periodEnd">;
  envelopeState: readonly EnvelopeCategoryState[];
  recurringRules: readonly RecurringTransactionRule[];
  forecast: ForecastResult | null;
  runway: RunwayResult | null;
  /** Uncategorized posted spend/refund rows in the period. */
  uncategorizedCount: number;
  /** Date-only (YYYY-MM-DD) reference day. */
  asOfDate: string;
  /** Category id → display name, for readable messages. */
  categoryNames?: ReadonlyMap<string, string>;
  /** How far ahead bill_due looks. Default 7 days. */
  billDueWindowDays?: number;
  /** Backlog size before an uncategorized alert fires. Default 10. */
  uncategorizedThreshold?: number;
}

function categoryLabel(
  names: ReadonlyMap<string, string> | undefined,
  categoryId: string,
): string {
  return names?.get(categoryId) ?? categoryId;
}

/**
 * Computes the alert set for one period. Deterministic: identical inputs
 * always produce the same alerts in the same order (sorted by dedupeKey).
 */
export function computeBudgetAlerts(input: BudgetAlertInput): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  const billWindow = input.billDueWindowDays ?? 7;
  const backlogThreshold = input.uncategorizedThreshold ?? 10;

  /* overspend — an envelope whose balance went below zero. */
  for (const state of input.envelopeState) {
    if (!state.overspent) continue;
    const label = categoryLabel(input.categoryNames, state.categoryId);
    alerts.push({
      kind: "overspend",
      severity: "amber",
      categoryId: state.categoryId,
      amountCents: state.overspentCents,
      title: `${label}: over assigned amount`,
      message: `Recorded spending in ${label} has passed its assigned amount by ${formatCentsUSD(state.overspentCents)} this period, based on your recorded transactions.`,
      dedupeKey: `overspend:${input.period.id}:${state.categoryId}`,
    });
  }

  /* bill_due — active expense rules with an occurrence within the window. */
  const dueEnd = nextDateAfter(input.asOfDate, billWindow);
  for (const rule of input.recurringRules) {
    if (rule.type !== "expense" || !rule.isActive || rule.deletedAt !== null) continue;
    const next = nextOccurrence(rule, previousDay(input.asOfDate));
    if (next === null || next > dueEnd) continue;
    alerts.push({
      kind: "bill_due",
      severity: "yellow",
      ruleId: rule.id,
      amountCents: rule.amountCents,
      title: `${rule.description} due ${next}`,
      message: `${rule.description} (${formatCentsUSD(rule.amountCents)}) is scheduled on ${next}, based on its recurring rule.`,
      dedupeKey: `bill_due:${recurringGenerationKey(rule.id, next)}`,
    });
  }

  /* low_runway (forecast) — a projection that crosses zero is a signal even
   * when liquid-savings runway is unknown. */
  if (input.forecast !== null && input.forecast.daysUntilNegative !== null) {
    alerts.push({
      kind: "low_runway",
      severity: input.forecast.daysUntilNegative <= 7 ? "crimson" : "amber",
      message: `The current projection crosses a zero balance in ${input.forecast.daysUntilNegative} days. ${input.forecast.disclaimer}`,
      title: "Projected balance crosses zero",
      dedupeKey: `low_runway:forecast:${input.period.id}`,
    });
  }

  /* low_runway — only when a real runway number exists. */
  if (input.runway !== null && input.runway.months !== null) {
    if (input.runway.months < 1) {
      alerts.push({
        kind: "low_runway",
        severity: "crimson",
        message: `Recorded balances cover less than 1 month of outflow on the ${runwayBasisLabel(input.runway.basis)} basis.`,
        title: "Runway under 1 month",
        dedupeKey: `low_runway:${input.period.id}`,
      });
    } else if (input.runway.months < 3) {
      alerts.push({
        kind: "low_runway",
        severity: "amber",
        message: `Recorded balances cover about ${Math.round(input.runway.months * 10) / 10} months of outflow on the ${runwayBasisLabel(input.runway.basis)} basis.`,
        title: "Runway under 3 months",
        dedupeKey: `low_runway:${input.period.id}`,
      });
    }
  }

  /* uncategorized_backlog — unlabeled rows weaken every derived number. */
  if (input.uncategorizedCount >= backlogThreshold) {
    alerts.push({
      kind: "uncategorized_backlog",
      severity: "yellow",
      title: `${input.uncategorizedCount} uncategorized transactions`,
      message: `${input.uncategorizedCount} recorded transactions this period have no category, so category totals and projections are partial.`,
      dedupeKey: `uncategorized:${input.period.id}`,
    });
  }

  /* rule_conflict — two live rules of the same type with the same
   * normalized description and amounts within 5% may be double-counting
   * the same real-world item. */
  const live = input.recurringRules.filter((rule) => rule.isActive && rule.deletedAt === null);
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const a = live[i];
      const b = live[j];
      if (a.type !== b.type) continue;
      if (normalizePayee(a.description) !== normalizePayee(b.description)) continue;
      const lo = Math.min(a.amountCents, b.amountCents);
      const hi = Math.max(a.amountCents, b.amountCents);
      if (hi - lo > hi * 0.05) continue;
      const [first, second] = [a.id, b.id].sort();
      alerts.push({
        kind: "rule_conflict",
        severity: "yellow",
        ruleId: first,
        amountCents: b.amountCents,
        title: `Possible duplicate rule: ${a.description}`,
        message: `Two active rules describe "${a.description}" at similar amounts (${formatCentsUSD(a.amountCents)} and ${formatCentsUSD(b.amountCents)}). If they track the same item, forecasts count it twice.`,
        dedupeKey: `rule_conflict:${first}:${second}`,
      });
    }
  }

  return alerts.sort((a, b) => a.dedupeKey.localeCompare(b.dedupeKey));
}

/* ------------------------------------------------------------------ */
/* Small date helpers (local, date-only)                               */
/* ------------------------------------------------------------------ */

function nextDateAfter(date: string, days: number): string {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

function previousDay(date: string): string {
  return nextDateAfter(date, -1);
}

function runwayBasisLabel(basis: RunwayResult["basis"]): string {
  switch (basis) {
    case "current_month_actual":
      return "current month actual";
    case "trailing_three_month_average":
      return "trailing three-month average";
    case "user_selected_baseline":
      return "selected baseline";
    case "required_obligations_only":
      return "required obligations only";
  }
}
