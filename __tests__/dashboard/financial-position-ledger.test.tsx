// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { AdvisorFinanceContext } from "@/lib/advisor/fallback";
import {
  buildLedgerDashboardView,
  ledgerDashboardKpis,
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

  it("returns null when neither ledger nor snapshot exists", () => {
    expect(buildLedgerDashboardView(null, null)).toBeNull();
  });
});

describe("GoalCard with ledger goal", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the ledger goal instead of the legacy goal", () => {
    const legacyGoal = { label: "Legacy down payment", target_amount: 50_000, target_date: null as string | null };
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
    const legacyGoal = { label: "Legacy down payment", target_amount: 60_000, target_date: null as string | null };

    render(
      <GoalCard goal={legacyGoal} liquidSavings={12_000} monthlyNetCashFlow={800} />,
    );

    expect(screen.getByText("Legacy down payment")).toBeInTheDocument();
    expect(screen.getByText(/\$60,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$12,000/)).toBeInTheDocument();
  });
});
