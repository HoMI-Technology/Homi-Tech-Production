/**
 * Single loader for Home standing + Money Stand.
 * Surfaces that show PERIOD_SURPLUS_LABEL must call this — never a parallel
 * metricsFromLedger copy that can silently drift.
 */

import {
  budgetLedgerSavedAt,
  hasSavedBudgetLedger,
  loadBudgetLedger,
} from "@/lib/finance/local-ledger";
import { metricsFromLedger, type NamedMoneyMetrics } from "@/lib/finance/metrics";

export function loadStandMetrics(
  nowIso: string = new Date().toISOString(),
): NamedMoneyMetrics | null {
  if (!hasSavedBudgetLedger()) return null;
  const ledger = loadBudgetLedger(nowIso);
  const metrics = metricsFromLedger(ledger, nowIso, budgetLedgerSavedAt());
  if (
    !metrics.evidence.hasIncome &&
    !metrics.evidence.hasExpenses &&
    metrics.evidence.monthsWithData === 0
  ) {
    return null;
  }
  return metrics;
}
