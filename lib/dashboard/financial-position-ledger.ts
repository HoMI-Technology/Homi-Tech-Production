/**
 * Ledger-first dashboard shaping for the Financial position section.
 *
 * Keeps the server component thin and testable: the ledger-derived advisor
 * context is converted into the same four tile numbers the Plaid snapshot
 * path already produces, and fallback to the legacy snapshot is explicit.
 */

import type { AdvisorFinanceContext } from "@/lib/advisor/fallback";
import type { SnapshotReading } from "@/lib/dashboard/financial-position";
import { formatCurrencyTile } from "@/lib/tools/format";

export interface DashboardKpis {
  /** Null when no source can compute it — the tile renders "unknown", not $0. */
  netWorth: number | null;
  cashFlow: number;
  savingsRatePct: number;
}

export interface LedgerDashboardView {
  /** Which data source produced the KPIs. */
  source: "ledger" | "plaid";
  kpis: DashboardKpis;
}

export interface NetWorthTileState {
  /** What the tile prints. An em dash when no source can supply a figure. */
  value: string;
  footer: string;
  /**
   * Whether the delta and sparkline should render. Both describe movement in a
   * figure, so they are meaningless when there is no figure — and the trend
   * series comes from synced snapshots, which is also the only source that can
   * produce a net worth today.
   */
  showTrend: boolean;
}

/**
 * The Net worth tile's display decision, kept out of the async server component
 * so the unknown branch is testable without rendering it.
 *
 * The v1 ledger has no liability type, so it reports net worth as unknown and
 * the tile must say so rather than print $0 — a confident wrong number on the
 * one tile a user reads as a summary of everything they own and owe.
 */
export function netWorthTileState(netWorth: number | null): NetWorthTileState {
  if (netWorth === null) {
    return {
      value: "—",
      footer: "Connect accounts to see what you own and owe",
      showTrend: false,
    };
  }

  return {
    value: formatCurrencyTile(netWorth),
    footer: "From your synced balances",
    showTrend: true,
  };
}

export function ledgerDashboardKpis(context: AdvisorFinanceContext): DashboardKpis {
  return {
    netWorth: context.netWorth === null ? null : Math.round(context.netWorth),
    cashFlow: Math.round(context.netCashFlow),
    savingsRatePct: Math.round(context.savingsRate),
  };
}

/**
 * Builds the dashboard's KPIs, preferring the ledger when it has real data and
 * falling back to the most recent Plaid financial snapshot.
 *
 * The fallback is per-field, not all-or-nothing. Cash flow and savings rate are
 * transaction-derived, so the ledger is the better source whenever it exists.
 * Net worth is not: the v1 ledger has no liability type and reports null, so a
 * Plaid snapshot — which carries a real net_worth — fills that one field. The
 * user keeps the accurate figure they already had instead of losing it to the
 * newer-but-blinder source.
 *
 * Returns null only when neither source is available.
 */
export function buildLedgerDashboardView(
  ledgerContext: AdvisorFinanceContext | null,
  latestSnapshot: SnapshotReading | null,
): LedgerDashboardView | null {
  if (ledgerContext) {
    const kpis = ledgerDashboardKpis(ledgerContext);
    if (kpis.netWorth === null && latestSnapshot) {
      kpis.netWorth = Number(latestSnapshot.net_worth);
    }
    return { source: "ledger", kpis };
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
