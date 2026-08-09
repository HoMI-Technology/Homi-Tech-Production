import { describe, it, expect } from "vitest";
import {
  buildFinanceContextFromLegacy,
  buildFinanceContextFromLedger,
} from "@/lib/advisor/finance-context";
import {
  addManualTransaction,
  emptyBudgetLedger,
  ensurePeriodFor,
  setGoalReserve,
  upsertGoal,
  type BudgetLedgerState,
} from "@/lib/finance/local-ledger";
import type { FinanceTransaction } from "@/lib/finance/ledger";
import type { FinanceState } from "@/lib/finance/store";

const NOW = "2026-08-03T12:00:00.000Z";
const TODAY = "2026-08-03";

function seeded(): BudgetLedgerState {
  return emptyBudgetLedger(NOW);
}

function withPeriod(date = TODAY): { state: BudgetLedgerState; periodId: string } {
  const { state, period } = ensurePeriodFor(seeded(), date, NOW);
  return { state, periodId: period.id };
}

function tx(overrides: Partial<FinanceTransaction>): FinanceTransaction {
  return {
    id: "tx-test",
    userId: "local",
    type: "expense",
    status: "posted",
    amountCents: 100_00,
    currency: "USD",
    description: "Test",
    merchantName: null,
    categoryId: "cat-groceries",
    accountId: null,
    transactionDate: TODAY,
    postedAt: NOW,
    source: "manual",
    externalTransactionId: null,
    recurringRuleId: null,
    transferGroupId: null,
    parentTransactionId: null,
    isExcludedFromBudget: false,
    userNote: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  } as FinanceTransaction;
}

const DEFAULT_LEGACY: FinanceState = {
  monthlyIncome: 6500,
  monthlyExpenses: 4200,
  liquidSavings: 18000,
  totalDebt: 22000,
  monthlyDebtPayments: 650,
  expenseCategories: [
    { id: "cat-rent", name: "Rent / mortgage", amount: 1800 },
    { id: "cat-food", name: "Food", amount: 650 },
  ],
  downPaymentTarget: 60000,
  monteCarloYears: 5,
  expectedReturnPct: 5,
  volatilityPct: 8,
  assets: [
    { id: "asset-cash", name: "Cash & savings", amount: 18000 },
    { id: "asset-retirement", name: "Retirement accounts", amount: 32000 },
  ],
  liabilities: [{ id: "liability-debt", name: "Credit cards & loans", amount: 22000 }],
};

describe("buildFinanceContextFromLegacy", () => {
  it("converts legacy state to advisor context", () => {
    const ctx = buildFinanceContextFromLegacy(DEFAULT_LEGACY, NOW);
    expect(ctx.monthlyIncome).toBe(6500);
    expect(ctx.netCashFlow).toBe(1650);
    expect(ctx.savingsRate).toBeCloseTo(25.4, 1);
    expect(ctx.runwayMonths).toBeCloseTo(3.7, 1);
    expect(ctx.dti).toBeCloseTo(10, 5);
    expect(ctx.liquidSavings).toBe(18000);
    expect(ctx.totalDebt).toBe(22000);
    expect(ctx.netWorth).toBe(28000);
    expect(typeof ctx.ageDays).toBe("number");
    expect(ctx.ageDays!).toBeGreaterThanOrEqual(0);
  });

  it("computes negative net cash flow and crimson signals when spending exceeds income", () => {
    const state: FinanceState = {
      ...DEFAULT_LEGACY,
      monthlyIncome: 5000,
      monthlyExpenses: 4800,
      monthlyDebtPayments: 650,
    };
    const ctx = buildFinanceContextFromLegacy(state);
    expect(ctx.netCashFlow).toBe(-450);
    expect(ctx.savingsRate).toBeLessThan(0);
  });

  it("returns null ageDays when savedAt is missing", () => {
    const ctx = buildFinanceContextFromLegacy(DEFAULT_LEGACY, null);
    expect(ctx.ageDays).toBeNull();
  });
});

describe("buildFinanceContextFromLedger", () => {
  it("returns undefined for an empty seeded ledger", () => {
    expect(buildFinanceContextFromLedger(seeded(), NOW)).toBeUndefined();
  });

  it("derives monthly income from the open period's expectedIncomeCents", () => {
    let { state, periodId } = withPeriod();
    state = setGoalReserve(state, periodId, 500_00, NOW);
    state = upsertGoal(
      state,
      {
        name: "Emergency reserve",
        goalType: "emergency_reserve",
        targetAmountCents: 20_000_00,
        currentAmountCents: 10_000_00,
        plannedMonthlyContributionCents: 500_00,
        targetDate: null,
      },
      NOW,
    );

    // Patch expected income directly — the period already exists.
    state = {
      ...state,
      periods: state.periods.map((p) =>
        p.id === periodId ? { ...p, expectedIncomeCents: 8_000_00 } : p,
      ),
    };

    const ctx = buildFinanceContextFromLedger(state, NOW);
    expect(ctx).toBeDefined();
    expect(ctx!.monthlyIncome).toBe(8000);
    expect(ctx!.liquidSavings).toBe(10000);
    // Net worth stays unknown even with a funded reserve — $10k saved says
    // nothing about what this user owes, and the v1 ledger cannot see debt.
    expect(ctx!.netWorth).toBeNull();
    expect(ctx!.goals).toHaveLength(1);
    expect(ctx!.goals![0].pct).toBe(50);
  });

  it("falls back to trailing 3-month income average when expectedIncomeCents is unset", () => {
    let state = seeded();
    for (const [date, amount] of [
      ["2026-08-01", 6_000_00],
      ["2026-07-15", 5_000_00],
      ["2026-06-15", 4_000_00],
      ["2026-05-15", 100_00],
    ] as const) {
      state = addManualTransaction(
        state,
        {
          type: "income",
          amountCents: amount,
          description: "Paycheck",
          categoryId: "cat-payroll",
          transactionDate: date,
        },
        NOW,
      );
    }

    const ctx = buildFinanceContextFromLedger(state, NOW);
    expect(ctx).toBeDefined();
    // (6000 + 5000 + 4000) / 3 = 5000
    expect(ctx!.monthlyIncome).toBe(5000);
  });

  it("returns monthlyIncome of zero when there is no income signal", () => {
    let { state, periodId } = withPeriod();
    state = addManualTransaction(
      state,
      {
        type: "expense",
        amountCents: 1_000_00,
        description: "Rent",
        categoryId: "cat-housing",
        transactionDate: TODAY,
      },
      NOW,
    );

    const ctx = buildFinanceContextFromLedger(state, NOW);
    expect(ctx).toBeDefined();
    expect(ctx!.monthlyIncome).toBe(0);
    expect(ctx!.netCashFlow).toBe(-1000);
    expect(ctx!.savingsRate).toBe(0);
  });

  it("caps recent transactions at 20", () => {
    let state = seeded();
    for (let i = 0; i < 25; i += 1) {
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

    const ctx = buildFinanceContextFromLedger(state, NOW);
    expect(ctx!.recentTransactions).toHaveLength(20);
  });

  it("caps top spending categories at 10", () => {
    let state = seeded();
    state.categories.forEach((c, i) => {
      if (c.categoryType !== "expense") return;
      state = addManualTransaction(
        state,
        {
          type: "expense",
          amountCents: (i + 1) * 100_00,
          description: c.name,
          categoryId: c.id,
          transactionDate: TODAY,
        },
        NOW,
      );
    });

    const ctx = buildFinanceContextFromLedger(state, NOW);
    expect(ctx!.topSpendingCategories!.length).toBeLessThanOrEqual(10);
  });

  it("produces an income-vs-spending series with at most 6 months", () => {
    let state = seeded();
    for (let i = 0; i < 12; i += 1) {
      const month = String((i % 12) + 1).padStart(2, "0");
      state = addManualTransaction(
        state,
        {
          type: "income",
          amountCents: 1_000_00,
          description: `Income ${i}`,
          categoryId: "cat-payroll",
          transactionDate: `2026-${month}-01`,
        },
        NOW,
      );
    }

    const ctx = buildFinanceContextFromLedger(state, NOW);
    expect(ctx!.incomeVsSpendingSeries).toHaveLength(6);
    // Series is chronological; August is the most recent month.
    expect(ctx!.incomeVsSpendingSeries![5].month).toBe("2026-08");
  });

  it("nets refunds against spending in the series", () => {
    let state = seeded();
    state = addManualTransaction(
      state,
      {
        type: "income",
        amountCents: 5_000_00,
        description: "Paycheck",
        categoryId: "cat-payroll",
        transactionDate: "2026-08-01",
      },
      NOW,
    );
    state = addManualTransaction(
      state,
      {
        type: "expense",
        amountCents: 1_000_00,
        description: "Purchase",
        categoryId: "cat-other",
        transactionDate: "2026-08-02",
      },
      NOW,
    );
    state = addManualTransaction(
      state,
      {
        type: "refund",
        amountCents: 300_00,
        description: "Return",
        categoryId: "cat-other",
        transactionDate: "2026-08-02",
      },
      NOW,
    );

    const ctx = buildFinanceContextFromLedger(state, NOW);
    const point = ctx!.incomeVsSpendingSeries!.find((p) => p.month === "2026-08")!;
    expect(point.income).toBe(5000);
    expect(point.spending).toBe(700);
  });
});

describe("signal generation", () => {
  it("fires dti-high when debt-payments exceed 36% of income", () => {
    let { state, periodId } = withPeriod();
    state = {
      ...state,
      periods: state.periods.map((p) =>
        p.id === periodId ? { ...p, expectedIncomeCents: 5_000_00 } : p,
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

    const ctx = buildFinanceContextFromLedger(state, NOW);
    expect(ctx!.dti).toBe(40);
    expect(ctx!.activeSignals!.some((s) => s.id === "dti-high")).toBe(true);
    expect(ctx!.nudges!.some((n) => n.id === "nudge-debt")).toBe(true);
  });

  it("fires runway-low and savings-rate-low signals", () => {
    let { state, periodId } = withPeriod();
    state = {
      ...state,
      periods: state.periods.map((p) =>
        p.id === periodId ? { ...p, expectedIncomeCents: 10_000_00, goalReserveCents: 500_00 } : p,
      ),
    };
    state = addManualTransaction(
      state,
      {
        type: "expense",
        amountCents: 5_000_00,
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
        currentAmountCents: 5_000_00,
        plannedMonthlyContributionCents: 500_00,
        targetDate: null,
      },
      NOW,
    );

    const ctx = buildFinanceContextFromLedger(state, NOW);
    expect(ctx!.activeSignals!.some((s) => s.id === "runway-low")).toBe(true);
    expect(ctx!.activeSignals!.some((s) => s.id === "savings-rate-low")).toBe(true);
    expect(ctx!.nudges!.some((n) => n.id === "nudge-runway")).toBe(true);
  });

  it("fires cash-flow-negative when expenses exceed income", () => {
    let { state, periodId } = withPeriod();
    state = {
      ...state,
      periods: state.periods.map((p) =>
        p.id === periodId ? { ...p, expectedIncomeCents: 3_000_00 } : p,
      ),
    };
    state = addManualTransaction(
      state,
      {
        type: "income",
        amountCents: 3_000_00,
        description: "Paycheck",
        categoryId: "cat-payroll",
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

    const ctx = buildFinanceContextFromLedger(state, NOW);
    expect(ctx!.netCashFlow).toBe(-500);
    expect(ctx!.activeSignals!.some((s) => s.id === "cash-flow-negative")).toBe(true);
    expect(ctx!.nudges!.some((n) => n.id === "nudge-spending")).toBe(true);
  });

  it("maps a home goal to readinessInputs.downPaymentProgressPct", () => {
    let { state } = withPeriod();
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

    const ctx = buildFinanceContextFromLedger(state, NOW);
    expect(ctx!.readinessInputs!.downPaymentProgressPct).toBe(25);
    // liquidSavings stays 0 because the goal is not an emergency reserve.
    expect(ctx!.liquidSavings).toBe(0);
  });

  /**
   * The v1 ledger has no liability transaction type, so it cannot know what a
   * user owes. Reporting 0 would state a fact we do not have — the Companion
   * renders these straight into its prompt ("total debt $0, net worth $0") and
   * the dashboard renders netWorth into the "Net worth" tile. Null means
   * "unknown", and every consumer must degrade rather than print a figure.
   */
  it("reports debt and net worth as unknown, not zero, while the ledger has no liabilities", () => {
    let { state } = withPeriod();
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

    const ctx = buildFinanceContextFromLedger(state, NOW);
    expect(ctx!.totalDebt).toBeNull();
    expect(ctx!.netWorth).toBeNull();
  });

  it("ignores deleted and non-posted transactions", () => {
    let { state, periodId } = withPeriod();
    state = {
      ...state,
      periods: state.periods.map((p) =>
        p.id === periodId ? { ...p, expectedIncomeCents: 5_000_00 } : p,
      ),
      transactions: [
        tx({ type: "income", amountCents: 5_000_00, categoryId: "cat-payroll" }),
        tx({ type: "income", amountCents: 1_000_00, categoryId: "cat-payroll", status: "pending" }),
        tx({ type: "income", amountCents: 1_000_00, categoryId: "cat-payroll", deletedAt: NOW }),
        tx({ type: "expense", amountCents: 2_000_00, categoryId: "cat-housing" }),
      ],
    };

    const ctx = buildFinanceContextFromLedger(state, NOW);
    expect(ctx!.monthlyIncome).toBe(5000);
    expect(ctx!.netCashFlow).toBe(3000);
    expect(ctx!.recentTransactions).toHaveLength(2);
  });
});
