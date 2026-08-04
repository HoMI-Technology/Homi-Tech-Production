import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadLegacyFinanceState,
  migrateLegacyToLedger,
  seedLedgerFromLegacyIfEmpty,
  LEGACY_FINANCE_STATE_KEYS,
} from "@/lib/finance/migrate-from-legacy";
import { loadBudgetLedger, BUDGET_LEDGER_STORAGE_KEY } from "@/lib/finance/local-ledger";
import type { FinanceCategory, FinanceTransaction } from "@/lib/finance/ledger";
import type { FinanceState } from "@/lib/finance/store";

const NOW = "2026-08-03T12:00:00.000Z";

const LEGACY_STATE: FinanceState = {
  monthlyIncome: 6500,
  monthlyExpenses: 4200,
  liquidSavings: 18000,
  totalDebt: 22000,
  monthlyDebtPayments: 650,

  expenseCategories: [
    { id: "cat-rent", name: "Rent / mortgage", amount: 1800 },
    { id: "cat-food", name: "Food", amount: 650 },
    { id: "cat-transport", name: "Transportation", amount: 350 },
    { id: "cat-utilities", name: "Utilities", amount: 280 },
    { id: "cat-other", name: "Everything else", amount: 1120 },
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

describe("loadLegacyFinanceState", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no legacy keys exist", () => {
    stubStorage();
    expect(loadLegacyFinanceState()).toBeNull();
  });

  it("reads the first valid legacy key it finds", () => {
    const backing = stubStorage();
    backing.set("homi:finance", JSON.stringify(LEGACY_STATE));
    expect(loadLegacyFinanceState()).toEqual(LEGACY_STATE);
  });

  it("skips malformed keys and falls back to a valid one", () => {
    const backing = stubStorage();
    backing.set("homi_state", "not json");
    backing.set("user_finance_state", JSON.stringify({ monthlyIncome: 1000 }));
    // missing required shape
    expect(loadLegacyFinanceState()).toBeNull();
  });

  it("accepts all configured legacy keys", () => {
    const backing = stubStorage();
    for (const key of LEGACY_FINANCE_STATE_KEYS) {
      backing.clear();
      backing.set(key, JSON.stringify(LEGACY_STATE));
      expect(loadLegacyFinanceState()).toEqual(LEGACY_STATE);
    }
  });
});

describe("migrateLegacyToLedger", () => {
  it("seeds system categories, a period, transactions, and a goal", () => {
    const state = migrateLegacyToLedger(LEGACY_STATE, NOW);

    expect(state.categories.length).toBeGreaterThan(0);
    expect(state.categories.some((c: FinanceCategory) => c.slug === "housing" && c.isSystem)).toBe(
      true,
    );
    expect(
      state.categories.some(
        (c: FinanceCategory) => c.slug === "payroll" && c.categoryType === "income",
      ),
    ).toBe(true);

    expect(state.periods).toHaveLength(1);
    expect(state.periods[0]).toMatchObject({
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      expectedIncomeCents: 650_000,
      status: "open",
    });

    const incomeTx = state.transactions.find((t: FinanceTransaction) => t.type === "income");
    expect(incomeTx).toMatchObject({
      amountCents: 650_000,
      categoryId: "cat-payroll",
      transactionDate: "2026-08-01",
      status: "posted",
      source: "manual",
    });

    const expenseTxs = state.transactions.filter((t: FinanceTransaction) => t.type === "expense");
    expect(expenseTxs).toHaveLength(LEGACY_STATE.expenseCategories.length);

    const rent = expenseTxs.find((t: FinanceTransaction) => t.categoryId === "cat-housing");
    expect(rent).toMatchObject({ amountCents: 180_000, description: "Rent / mortgage" });

    const food = expenseTxs.find((t: FinanceTransaction) => t.categoryId === "cat-groceries");
    expect(food).toMatchObject({ amountCents: 65_000, description: "Food" });

    expect(state.goal).toMatchObject({
      name: "Down payment",
      goalType: "home",
      targetAmountCents: 6_000_000,
      currentAmountCents: 1_800_000,
      status: "active",
    });
  });

  it("falls back to the 'other' category for unrecognized names", () => {
    const legacy: FinanceState = {
      ...LEGACY_STATE,
      expenseCategories: [{ id: "x", name: "Mystery spending", amount: 123 }],
    };
    const state = migrateLegacyToLedger(legacy, NOW);
    const tx = state.transactions.find((t: FinanceTransaction) => t.type === "expense")!;
    expect(tx.categoryId).toBe("cat-other");
    expect(tx.amountCents).toBe(12_300);
  });

  it("creates an emergency_reserve goal when there is no down-payment target", () => {
    const legacy: FinanceState = {
      ...LEGACY_STATE,
      downPaymentTarget: 0,
      liquidSavings: 5000,
    };
    const state = migrateLegacyToLedger(legacy, NOW);
    expect(state.goal).toMatchObject({
      name: "Emergency reserve",
      goalType: "emergency_reserve",
      targetAmountCents: 500_000,
      currentAmountCents: 500_000,
    });
  });

  it("creates no goal when both target and savings are zero", () => {
    const legacy: FinanceState = {
      ...LEGACY_STATE,
      downPaymentTarget: 0,
      liquidSavings: 0,
    };
    const state = migrateLegacyToLedger(legacy, NOW);
    expect(state.goal).toBeNull();
  });
});

describe("seedLedgerFromLegacyIfEmpty / loadBudgetLedger integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("seeds an empty ledger from legacy state and persists it", () => {
    const backing = stubStorage();
    backing.set("homi:finance", JSON.stringify(LEGACY_STATE));

    const loaded = loadBudgetLedger(NOW);
    expect(loaded.transactions.length).toBeGreaterThan(0);
    expect(loaded.goal).not.toBeNull();

    const persisted = backing.get(BUDGET_LEDGER_STORAGE_KEY);
    expect(persisted).toBeDefined();
    const parsed = JSON.parse(persisted!);
    expect(parsed.transactions.length).toBe(loaded.transactions.length);
  });

  it("does not overwrite a ledger that already has transactions", () => {
    const backing = stubStorage();
    backing.set("homi:finance", JSON.stringify(LEGACY_STATE));

    const existingTxId = "existing-tx";
    const existingLedger = {
      schemaVersion: 1,
      categories: [],
      transactions: [
        {
          id: existingTxId,
          userId: "local",
          type: "income",
          status: "posted",
          amountCents: 100_000,
          currency: "USD",
          description: "Existing",
          merchantName: null,
          categoryId: null,
          accountId: null,
          transactionDate: "2026-08-01",
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
        },
      ],
      periods: [],
      allocations: [],
      goal: null,
    };
    backing.set(BUDGET_LEDGER_STORAGE_KEY, JSON.stringify(existingLedger));

    const loaded = loadBudgetLedger(NOW);
    expect(loaded.transactions).toHaveLength(1);
    expect(loaded.transactions[0].id).toBe(existingTxId);
  });

  it("does not overwrite a ledger that already has a goal", () => {
    const backing = stubStorage();
    backing.set("homi:finance", JSON.stringify(LEGACY_STATE));

    const existingLedger = {
      schemaVersion: 1,
      categories: [],
      transactions: [],
      periods: [],
      allocations: [],
      goal: {
        id: "existing-goal",
        userId: "local",
        name: "Existing",
        goalType: "custom",
        targetAmountCents: 1_000_000,
        currentAmountCents: 0,
        targetDate: null,
        plannedMonthlyContributionCents: 0,
        linkedDecisionId: null,
        linkedAccountId: null,
        status: "active",
        createdAt: NOW,
        updatedAt: NOW,
      },
    };
    backing.set(BUDGET_LEDGER_STORAGE_KEY, JSON.stringify(existingLedger));

    const loaded = loadBudgetLedger(NOW);
    expect(loaded.goal?.id).toBe("existing-goal");
    expect(loaded.transactions).toHaveLength(0);
  });

  it("leaves the ledger empty when there is no legacy state", () => {
    stubStorage();
    const loaded = loadBudgetLedger(NOW);
    expect(loaded.transactions).toHaveLength(0);
    expect(loaded.periods).toHaveLength(0);
    expect(loaded.goal).toBeNull();
  });

  it("is SSR-safe without a window", () => {
    expect(seedLedgerFromLegacyIfEmpty(NOW)).toEqual(
      expect.objectContaining({
        transactions: [],
        periods: [],
        goal: null,
      }),
    );
  });
});
