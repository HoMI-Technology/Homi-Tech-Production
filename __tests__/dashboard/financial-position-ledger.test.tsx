// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { AdvisorFinanceContext } from "@/lib/advisor/fallback";
import {
  buildLedgerDashboardView,
  ledgerDashboardKpis,
  netWorthTileState,
} from "@/lib/dashboard/financial-position-ledger";
import type { SnapshotReading } from "@/lib/dashboard/financial-position";
import { GoalCard } from "@/components/dashboard/GoalCard";

function makeContext(overrides: Partial<AdvisorFinanceContext> = {}): AdvisorFinanceContext {
  return {
    monthlyIncome: 8_000,
    netCashFlow: 1_500,
    savingsRate: 18.75,
    runwayMonths: 4,
    dti: 12,
    liquidSavings: 18_000,
    totalDebt: 0,
    netWorth: 18_000,
    ...overrides,
  };
}

const PLAID_SNAPSHOT: SnapshotReading = {
  net_worth: 42_500,
  net_cash_flow: 1_200,
  savings_rate: 0.22,
  completed_at: "2026-08-01T12:00:00.000Z",
  state: { source: "plaid_sync", liquidSavings: 15_000 },
};

describe("ledgerDashboardKpis", () => {
  it("converts a ledger advisor context into dashboard tile numbers", () => {
    const ctx = makeContext({ netWorth: 25_000, netCashFlow: 2_000, savingsRate: 22.4 });
    const kpis = ledgerDashboardKpis(ctx);

    expect(kpis.netWorth).toBe(25_000);
    expect(kpis.cashFlow).toBe(2_000);
    expect(kpis.savingsRatePct).toBe(22);
  });

  it("passes an unknown net worth through as null rather than coercing to 0", () => {
    const kpis = ledgerDashboardKpis(makeContext({ netWorth: null, totalDebt: null }));

    expect(kpis.netWorth).toBeNull();
    expect(kpis.cashFlow).toBe(1_500);
  });
});

describe("buildLedgerDashboardView", () => {
  it("prefers ledger KPIs when a ledger context exists", () => {
    const ctx = makeContext({ netWorth: 30_000, netCashFlow: 2_500, savingsRate: 19.5 });
    const view = buildLedgerDashboardView(ctx, PLAID_SNAPSHOT);

    expect(view).not.toBeNull();
    expect(view!.source).toBe("ledger");
    expect(view!.kpis.netWorth).toBe(30_000);
    expect(view!.kpis.cashFlow).toBe(2_500);
    expect(view!.kpis.savingsRatePct).toBe(20);
  });

  it("falls back to the Plaid snapshot when no ledger context is available", () => {
    const view = buildLedgerDashboardView(null, PLAID_SNAPSHOT);

    expect(view).not.toBeNull();
    expect(view!.source).toBe("plaid");
    expect(view!.kpis.netWorth).toBe(42_500);
    expect(view!.kpis.cashFlow).toBe(1_200);
    expect(view!.kpis.savingsRatePct).toBe(22);
  });

  /**
   * The v1 ledger has no liability type, so it reports net worth as unknown.
   * Falling back per-field keeps the accurate synced figure the user already
   * had, instead of losing it to the newer-but-blinder source.
   */
  it("fills net worth from the Plaid snapshot when the ledger cannot compute it", () => {
    const ctx = makeContext({ netWorth: null, totalDebt: null, netCashFlow: 2_500 });
    const view = buildLedgerDashboardView(ctx, PLAID_SNAPSHOT);

    expect(view!.source).toBe("ledger");
    expect(view!.kpis.netWorth).toBe(42_500);
    // Cash flow and savings rate stay ledger-derived — only net worth falls back.
    expect(view!.kpis.cashFlow).toBe(2_500);
    expect(view!.kpis.savingsRatePct).toBe(19);
  });

  it("leaves net worth unknown when neither the ledger nor a snapshot can supply it", () => {
    const ctx = makeContext({ netWorth: null, totalDebt: null });
    const view = buildLedgerDashboardView(ctx, null);

    expect(view!.source).toBe("ledger");
    expect(view!.kpis.netWorth).toBeNull();
    expect(view!.kpis.cashFlow).toBe(1_500);
  });

  it("returns null when neither ledger nor snapshot exists", () => {
    expect(buildLedgerDashboardView(null, null)).toBeNull();
  });
});

/**
 * The Net worth tile is rendered by an async server component, so this is the
 * layer that can be tested. It is the last gate before a wrong number reaches
 * the one tile users read as a summary of everything they own and owe.
 */
describe("netWorthTileState", () => {
  it("labels an unknown net worth with an em dash and an explanation", () => {
    const tile = netWorthTileState(null);

    expect(tile.known).toBe(false);
    expect(tile.unknownLabel).toBe("—");
    // The whole point: never a currency string and never a zero.
    expect(tile.unknownLabel).not.toMatch(/\$|\d/);
    expect(tile.footer).toBe("Connect accounts to see what you own and owe");
  });

  it("hides the delta and sparkline when there is no figure to trend", () => {
    expect(netWorthTileState(null).showTrend).toBe(false);
  });

  it("marks a known net worth for formatting and enables the trend", () => {
    const tile = netWorthTileState(42_500);

    expect(tile.known).toBe(true);
    expect(tile.footer).toBe("From your synced balances");
    expect(tile.showTrend).toBe(true);
  });

  it("treats a genuine zero as a figure, not as unknown", () => {
    const tile = netWorthTileState(0);

    expect(tile.known).toBe(true);
    expect(tile.showTrend).toBe(true);
  });

  it("treats a negative net worth as a figure rather than hiding it", () => {
    const tile = netWorthTileState(-12_000);

    expect(tile.known).toBe(true);
    expect(tile.showTrend).toBe(true);
  });
});

describe("GoalCard with ledger goal", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the ledger goal instead of the legacy goal", () => {
    const legacyGoal = {
      label: "Legacy down payment",
      target_amount: 50_000,
      target_date: null as string | null,
    };
    const ledgerGoal = {
      name: "Ledger down payment",
      targetAmountCents: 10_000_000,
      currentAmountCents: 2_500_000,
      targetDate: "2028-01-01",
    };

    render(
      <GoalCard
        goal={legacyGoal}
        ledgerGoal={ledgerGoal}
        liquidSavings={25_000}
        monthlyNetCashFlow={1_500}
      />,
    );

    expect(screen.getByText("Ledger down payment")).toBeInTheDocument();
    expect(screen.getByText(/\$25,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$100,000/)).toBeInTheDocument();
    expect(screen.getByText(/25%/)).toBeInTheDocument();
  });

  it("still renders the legacy goal when no ledger goal is supplied", () => {
    const legacyGoal = {
      label: "Legacy down payment",
      target_amount: 60_000,
      target_date: null as string | null,
    };

    render(<GoalCard goal={legacyGoal} liquidSavings={12_000} monthlyNetCashFlow={800} />);

    expect(screen.getByText("Legacy down payment")).toBeInTheDocument();
    expect(screen.getByText(/\$60,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$12,000/)).toBeInTheDocument();
  });
});
