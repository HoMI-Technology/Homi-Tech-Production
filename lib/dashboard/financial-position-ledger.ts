/**
 * Ledger-first dashboard shaping for the Financial position section.
 *
 * Keeps the server component thin and testable: the ledger-derived advisor
 * context is converted into the same four tile numbers the Plaid snapshot
 * path already produces, and fallback to the legacy snapshot is explicit.
 */

import type { AdvisorFinanceContext } from "@/lib/advisor/fallback";
import type { SnapshotReading } from "@/lib/dashboard/financial-position";

export interface DashboardKpis {
  netWorth: number;
  cashFlow: number;
  savingsRatePct: number;
}

export interface LedgerDashboardView {
  /** Which data source produced the KPIs. */
  source: "ledger" | "plaid";
  kpis: DashboardKpis;
}

export function ledgerDashboardKpis(context: AdvisorFinanceContext): DashboardKpis {
  return {
    netWorth: Math.round(context.netWorth),
    cashFlow: Math.round(context.netCashFlow),
    savingsRatePct: Math.round(context.savingsRate),
  };
}

/**
 * Builds the dashboard's four KPIs, preferring the ledger when it has real
 * data and falling back to the most recent Plaid financial snapshot.
 * Returns null only when neither source is available.
 */
export function buildLedgerDashboardView(
  ledgerContext: AdvisorFinanceContext | null,
  latestSnapshot: SnapshotReading | null,
): LedgerDashboardView | null {
  if (ledgerContext) {
    return { source: "ledger", kpis: ledgerDashboardKpis(ledgerContext) };
  }

  if (latestSnapshot) {
    return {
      source: "plaid",
      kpis: {
        netWorth: Number(latestSnapshot.net_worth),
        cashFlow: Number(latestSnapshot.net_cash_flow),
        savingsRatePct: Math.round(Number(latestSnapshot.savings_rate) * 100),
      },
    };
  }

  return null;
}
