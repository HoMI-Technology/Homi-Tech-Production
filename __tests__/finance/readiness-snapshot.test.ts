import { afterEach, describe, expect, it, vi } from "vitest";
import {
  emptyBudgetLedger,
  addManualTransaction,
  upsertGoal,
  type BudgetLedgerState,
} from "@/lib/finance/local-ledger";
import { buildPathFinanceSnapshotFromLedger } from "@/lib/finance/readiness-snapshot";
import { financeSnapshotForPath } from "@/lib/readiness/store";
import { DEFAULT_FINANCE_STATE } from "@/lib/finance/store";

const NOW_ISO = "2026-08-04T12:00:00.000Z";
const NOW_DATE = "2026-08-04";

function augustPeriod(expectedIncomeCents: number | null) {
  return {
    id: "period-aug",
    userId: "local",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    expectedIncomeCents,
    goalReserveCents: 0,
    status: "open" as const,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  };
}

function emergencyGoal(currentAmountCents: number): BudgetLedgerState["goals"][number] {
  return {
    id: "goal-1",
    userId: "local",
    name: "Emergency reserve",
    goalType: "emergency_reserve" as const,
    targetAmountCents: 20_000_000,
    currentAmountCents,
    targetDate: null,
    plannedMonthlyContributionCents: 0,
    linkedDecisionId: null,
    linkedAccountId: null,
    status: "active" as const,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  };
}

function stubStorage(): Map<string, string> {
  const backing = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => backing.get(k) ?? null,
      setItem: (k: string, v: string) => void backing.set(k, v),
      removeItem: (k: string) => void backing.delete(k),
    },
  });
  return backing;
}

describe("buildPathFinanceSnapshotFromLedger", () => {
  it("uses the current period's expected income when set", () => {
    let state = emptyBudgetLedger(NOW_ISO);
    state = { ...state, periods: [augustPeriod(800_000)], goals: [emergencyGoal(12_000_000)] };

    state = addManualTransaction(
      state,
      {
        type: "income",
        amountCents: 800_000,
        description: "Payroll",
        categoryId: "cat-payroll",
        transactionDate: "2026-08-01",
      },
      NOW_ISO,
    );
    state = addManualTransaction(
      state,
      {
        type: "expense",
        amountCents: 300_000,
        description: "Rent",
        categoryId: "cat-housing",
        transactionDate: "2026-08-02",
      },
      NOW_ISO,
    );
    state = addManualTransaction(
      state,
      {
        type: "expense",
        amountCents: 200_000,
        description: "Credit card + loan payments",
        categoryId: "cat-debt-payments",
        transactionDate: "2026-08-03",
      },
      NOW_ISO,
    );

    const snapshot = buildPathFinanceSnapshotFromLedger(state, NOW_DATE);
    expect(snapshot).toEqual({
      monthlyIncome: 8_000,
      netCashFlow: 3_000,
      monthlyExpenses: 5_000,
      monthlyDebtPayments: 2_000,
      liquidSavings: 120_000,
      runwayMonths: 17.1,
    });
  });

  it("falls back to a trailing three-month income average", () => {
    let state = emptyBudgetLedger(NOW_ISO);
    state = { ...state, periods: [augustPeriod(null)] };

    // June income: $9,000; July income: $6,000; no August income.
    state = addManualTransaction(
      state,
      {
        type: "income",
        amountCents: 900_000,
        description: "Payroll",
        categoryId: "cat-payroll",
        transactionDate: "2026-06-15",
      },
      NOW_ISO,
    );
    state = addManualTransaction(
      state,
      {
        type: "income",
        amountCents: 600_000,
        description: "Payroll",
        categoryId: "cat-payroll",
        transactionDate: "2026-07-15",
      },
      NOW_ISO,
    );

    const snapshot = buildPathFinanceSnapshotFromLedger(state, NOW_DATE);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.monthlyIncome).toBe(5_000); // (9,000 + 6,000 + 0) / 3
    expect(snapshot!.netCashFlow).toBe(0);
    expect(snapshot!.runwayMonths).toBeNull();
    expect(snapshot!.monthlyExpenses).toBe(0);
    expect(snapshot!.liquidSavings).toBe(0);
    expect(snapshot!.monthlyDebtPayments).toBe(0);
  });

  it("returns null for an empty ledger", () => {
    const state = emptyBudgetLedger(NOW_ISO);
    expect(buildPathFinanceSnapshotFromLedger(state, NOW_DATE)).toBeNull();
  });

  it("extracts monthly debt payments from the cat-debt-payments category", () => {
    let state = emptyBudgetLedger(NOW_ISO);
    state = { ...state, periods: [augustPeriod(null)] };

    state = addManualTransaction(
      state,
      {
        type: "expense",
        amountCents: 150_000,
        description: "Student loan",
        categoryId: "cat-debt-payments",
        transactionDate: "2026-08-10",
      },
      NOW_ISO,
    );

    const snapshot = buildPathFinanceSnapshotFromLedger(state, NOW_DATE);
    expect(snapshot).toMatchObject({
      monthlyDebtPayments: 1_500,
      monthlyExpenses: 1_500,
      netCashFlow: -1_500,
    });
  });
});

describe("financeSnapshotForPath ledger integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to legacy FinanceState when no budget ledger exists", () => {
    const backing = stubStorage();
    backing.set("homi:finance", JSON.stringify(DEFAULT_FINANCE_STATE));

    const snapshot = financeSnapshotForPath();
    expect(snapshot).toMatchObject({
      monthlyIncome: 6_500,
      monthlyExpenses: 4_200,
      monthlyDebtPayments: 650,
      liquidSavings: 18_000,
      netCashFlow: 1_650,
    });
    expect(snapshot?.runwayMonths).toBeCloseTo(18_000 / (4_200 + 650), 4);
  });
});
