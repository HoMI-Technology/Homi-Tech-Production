// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  addManualTransaction,
  BUDGET_LEDGER_STORAGE_KEY,
  emptyBudgetLedger,
  ensurePeriodFor,
  saveBudgetLedger,
  upsertGoal,
  type BudgetLedgerState,
} from "@/lib/finance/local-ledger";
import type { BudgetPeriod } from "@/lib/finance/ledger";
import { useFinanceDashboard } from "@/hooks/use-finance-dashboard";

const NOW = "2026-08-03T12:00:00.000Z";
const TODAY = "2026-08-03";

describe("useFinanceDashboard", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function seeded(): BudgetLedgerState {
    return emptyBudgetLedger(NOW);
  }

  function withPeriod(date = TODAY): { state: BudgetLedgerState; period: BudgetPeriod } {
    const { state, period } = ensurePeriodFor(seeded(), date, NOW);
    return { state, period };
  }

  function persist(state: BudgetLedgerState): void {
    saveBudgetLedger(state);
  }

  it("returns loading initially and then a non-ready dashboard for an empty ledger", async () => {
    const { result } = renderHook(() => useFinanceDashboard());

    expect(result.current.ready).toBe(false);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.ready).toBe(false);
    expect(result.current.kpis.monthlyIncome).toBe(0);
    expect(result.current.signals).toHaveLength(0);
  });

  it("derives KPIs and temperatures from the saved ledger", async () => {
    let { state, period } = withPeriod();
    state = {
      ...state,
      periods: state.periods.map((p) =>
        p.id === period.id ? { ...p, expectedIncomeCents: 8_000_00 } : p,
      ),
    };
    state = addManualTransaction(
      state,
      {
        type: "expense",
        amountCents: 2_000_00,
        description: "Rent",
        categoryId: "cat-housing",
        transactionDate: TODAY,
      },
      NOW,
    );
    state = upsertGoal(
      state,
      {
        name: "Emergency reserve",
        goalType: "emergency_reserve",
        targetAmountCents: 30_000_00,
        currentAmountCents: 18_000_00,
        plannedMonthlyContributionCents: 500_00,
        targetDate: null,
      },
      NOW,
    );
    persist(state);

    const { result } = renderHook(() => useFinanceDashboard());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.kpis.monthlyIncome).toBe(8000);
    expect(result.current.kpis.netCashFlow).toBe(6000);
    expect(result.current.kpis.liquidSavings).toBe(18000);
    expect(result.current.kpis.netWorth).toBe(18000);
    expect(result.current.temperatures.cashFlow).toBe("emerald");
    expect(result.current.temperatures.dti).toBe("emerald");
  });

  it("fires signals and nudges when thresholds are breached", async () => {
    let { state, period } = withPeriod();
    state = {
      ...state,
      periods: state.periods.map((p) =>
        p.id === period.id
          ? { ...p, expectedIncomeCents: 5_000_00, goalReserveCents: 200_00 }
          : p,
      ),
    };
    state = addManualTransaction(
      state,
      {
        type: "expense",
        amountCents: 2_000_00,
        description: "Debt payment",
        categoryId: "cat-debt-payments",
        transactionDate: TODAY,
      },
      NOW,
    );
    state = addManualTransaction(
      state,
      {
        type: "expense",
        amountCents: 3_500_00,
        description: "Rent",
        categoryId: "cat-housing",
        transactionDate: TODAY,
      },
      NOW,
    );
    persist(state);

    const { result } = renderHook(() => useFinanceDashboard());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.signals.some((s) => s.id === "dti-high")).toBe(true);
    expect(result.current.signals.some((s) => s.id === "cash-flow-negative")).toBe(true);
    expect(result.current.nudges.length).toBeGreaterThan(0);
    expect(result.current.nudges.length).toBeLessThanOrEqual(3);
    expect(result.current.temperatures.cashFlow).toBe("crimson");
  });

  it("adds an all-clear signal and a healthy nudge when all metrics are healthy", async () => {
    let { state, period } = withPeriod();
    state = {
      ...state,
      periods: state.periods.map((p) =>
        p.id === period.id
          ? { ...p, expectedIncomeCents: 10_000_00, goalReserveCents: 1_500_000 }
          : p,
      ),
    };
    state = upsertGoal(
      state,
      {
        name: "Emergency reserve",
        goalType: "emergency_reserve",
        targetAmountCents: 60_000_00,
        currentAmountCents: 30_000_00,
        plannedMonthlyContributionCents: 1_000_00,
        targetDate: null,
      },
      NOW,
    );
    persist(state);

    const { result } = renderHook(() => useFinanceDashboard());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.signals).toHaveLength(1);
    expect(result.current.signals[0].id).toBe("all-clear");
    expect(result.current.nudges.length).toBeGreaterThan(0);
    expect(result.current.temperatures.savingsRate).toBe("emerald");
  });

  it("caps recent transactions at 6", async () => {
    let state = seeded();
    for (let i = 0; i < 10; i += 1) {
      state = addManualTransaction(
        state,
        {
          type: "expense",
          amountCents: 10_00,
          description: `Item ${i}`,
          categoryId: "cat-groceries",
          transactionDate: `2026-08-${String((i % 28) + 1).padStart(2, "0")}`,
        },
        NOW,
      );
    }
    persist(state);

    const { result } = renderHook(() => useFinanceDashboard());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.recentTransactions).toHaveLength(6);
  });

  it("returns a category breakdown that sums to the total spending", async () => {
    let { state, period } = withPeriod();
    state = {
      ...state,
      periods: state.periods.map((p) =>
        p.id === period.id ? { ...p, expectedIncomeCents: 6_000_00 } : p,
      ),
    };
    state = addManualTransaction(
      state,
      { type: "expense", amountCents: 1_500_00, description: "Rent", categoryId: "cat-housing", transactionDate: TODAY },
      NOW,
    );
    state = addManualTransaction(
      state,
      { type: "expense", amountCents: 500_00, description: "Groceries", categoryId: "cat-groceries", transactionDate: TODAY },
      NOW,
    );
    persist(state);

    const { result } = renderHook(() => useFinanceDashboard());
    await waitFor(() => expect(result.current.ready).toBe(true));

    const breakdown = result.current.categoryBreakdown;
    expect(breakdown).toHaveLength(2);
    const totalPct = breakdown.reduce((sum, c) => sum + c.pct, 0);
    expect(totalPct).toBeCloseTo(100, 0);
    expect(breakdown[0].amount).toBe(1500);
    expect(breakdown[0].color).toBeDefined();
  });

  it("computes rising and falling category trends vs the prior month", async () => {
    let { state, period } = withPeriod();
    state = {
      ...state,
      periods: state.periods.map((p) =>
        p.id === period.id ? { ...p, expectedIncomeCents: 6_000_00 } : p,
      ),
    };
    state = addManualTransaction(
      state,
      { type: "expense", amountCents: 1_000_00, description: "Rent", categoryId: "cat-housing", transactionDate: "2026-07-15" },
      NOW,
    );
    state = addManualTransaction(
      state,
      { type: "expense", amountCents: 2_000_00, description: "Rent", categoryId: "cat-housing", transactionDate: TODAY },
      NOW,
    );
    state = addManualTransaction(
      state,
      { type: "expense", amountCents: 800_00, description: "Groceries", categoryId: "cat-groceries", transactionDate: "2026-07-10" },
      NOW,
    );
    state = addManualTransaction(
      state,
      { type: "expense", amountCents: 400_00, description: "Groceries", categoryId: "cat-groceries", transactionDate: TODAY },
      NOW,
    );
    persist(state);

    const { result } = renderHook(() => useFinanceDashboard());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.categoryTrends.rising.some((t) => t.name === "Housing" && t.delta === 1000)).toBe(true);
    expect(result.current.categoryTrends.falling.some((t) => t.name === "Groceries" && t.delta === -400)).toBe(true);
  });

  it("returns the active goal snapshot", async () => {
    let state = withPeriod().state;
    state = upsertGoal(
      state,
      {
        name: "Down payment",
        goalType: "home",
        targetAmountCents: 100_000_00,
        currentAmountCents: 25_000_00,
        plannedMonthlyContributionCents: 1_000_00,
        targetDate: null,
      },
      NOW,
    );
    persist(state);

    const { result } = renderHook(() => useFinanceDashboard());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.goals).toHaveLength(1);
    expect(result.current.goals[0].name).toBe("Down payment");
    expect(result.current.goals[0].pct).toBe(25);
  });

  it("stays non-ready when localStorage has a key but no usable data", async () => {
    window.localStorage.setItem(BUDGET_LEDGER_STORAGE_KEY, JSON.stringify({ schemaVersion: 1 }));

    const { result } = renderHook(() => useFinanceDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.ready).toBe(false);
  });
});
