import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LEDGER_LIQUID_ACCOUNT_ID,
  ledgerTxToPlanner,
  syncPlannerWithLedger,
  dualWriteAddTransaction,
} from "@/lib/planner/ledger-bridge";
import {
  emptyBudgetLedger,
  saveBudgetLedger,
  loadBudgetLedger,
} from "@/lib/finance/local-ledger";
import { usePlannerStore } from "@/lib/planner/store";
import type { FinanceTransaction } from "@/lib/finance/ledger";

function stubStorage(): void {
  const backing = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => backing.get(k) ?? null,
      setItem: (k: string, v: string) => void backing.set(k, v),
      removeItem: (k: string) => void backing.delete(k),
    },
  });
}

describe("ledger-bridge", () => {
  beforeEach(() => {
    stubStorage();
    usePlannerStore.setState({
      transactions: [],
      accounts: [],
      bills: [],
      holdings: [],
      netWorthItems: [],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps ledger income/expense into planner transactions", () => {
    const now = new Date().toISOString();
    const ledger = emptyBudgetLedger(now);
    const expenseCat = ledger.categories.find((c) => c.slug === "housing" || c.id === "cat-housing");
    const tx: FinanceTransaction = {
      id: "abc123",
      userId: "local",
      type: "expense",
      status: "posted",
      amountCents: 150_00,
      currency: "USD",
      description: "Rent",
      merchantName: null,
      categoryId: expenseCat?.id ?? "cat-housing",
      accountId: null,
      transactionDate: "2026-08-01",
      postedAt: now,
      source: "manual",
      externalTransactionId: null,
      recurringRuleId: null,
      transferGroupId: null,
      parentTransactionId: null,
      isExcludedFromBudget: false,
      userNote: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const mapped = ledgerTxToPlanner(tx, ledger);
    expect(mapped).toMatchObject({
      id: "tx_abc123",
      type: "expense",
      amount: 150,
      category: "housing",
      date: "2026-08-01",
    });
  });

  it("syncs ledger transactions into empty planner (ledger SoT)", () => {
    const now = new Date().toISOString();
    let ledger = emptyBudgetLedger(now);
    const housing = ledger.categories.find((c) => c.id === "cat-housing" || c.slug === "housing");
    const salary = ledger.categories.find((c) => c.id === "cat-salary" || c.slug === "salary");
    ledger = {
      ...ledger,
      transactions: [
        {
          id: "inc1",
          userId: "local",
          type: "income",
          status: "posted",
          amountCents: 5000_00,
          currency: "USD",
          description: "Pay",
          merchantName: null,
          categoryId: salary?.id ?? "cat-salary",
          accountId: null,
          transactionDate: "2026-08-01",
          postedAt: now,
          source: "manual",
          externalTransactionId: null,
          recurringRuleId: null,
          transferGroupId: null,
          parentTransactionId: null,
          isExcludedFromBudget: false,
          userNote: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
        {
          id: "exp1",
          userId: "local",
          type: "expense",
          status: "posted",
          amountCents: 1200_00,
          currency: "USD",
          description: "Rent",
          merchantName: null,
          categoryId: housing?.id ?? "cat-housing",
          accountId: null,
          transactionDate: "2026-08-02",
          postedAt: now,
          source: "manual",
          externalTransactionId: null,
          recurringRuleId: null,
          transferGroupId: null,
          parentTransactionId: null,
          isExcludedFromBudget: false,
          userNote: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ],
    };
    saveBudgetLedger(ledger);

    syncPlannerWithLedger();

    const txs = usePlannerStore.getState().transactions;
    expect(txs.length).toBe(2);
    expect(txs.find((t) => t.type === "income")?.amount).toBe(5000);
    expect(txs.find((t) => t.type === "expense")?.amount).toBe(1200);
  });

  it("seeds ledger from planner when ledger empty, then re-imports", () => {
    usePlannerStore.setState({
      transactions: [
        {
          id: "tx_manual1",
          type: "income",
          amount: 4000,
          category: "salary",
          date: "2026-08-01",
          source: "manual",
        },
        {
          id: "tx_manual2",
          type: "expense",
          amount: 800,
          category: "food",
          date: "2026-08-03",
          source: "manual",
        },
      ],
    });

    syncPlannerWithLedger();

    const now = new Date().toISOString().slice(0, 10);
    const ledger = loadBudgetLedger(now);
    const active = ledger.transactions.filter((t) => !t.deletedAt);
    expect(active.length).toBeGreaterThanOrEqual(2);

    const planner = usePlannerStore.getState().transactions;
    expect(planner.length).toBeGreaterThanOrEqual(2);
  });

  it("dual-write add does not drop expenses without exact slug match", () => {
    dualWriteAddTransaction({
      id: "tx_new1",
      type: "expense",
      amount: 42,
      category: "other",
      date: "2026-08-05",
      source: "manual",
    });

    const now = new Date().toISOString().slice(0, 10);
    const ledger = loadBudgetLedger(now);
    expect(ledger.transactions.some((t) => !t.deletedAt && Number(t.amountCents) === 4200)).toBe(
      true,
    );
  });

  it("injects synthetic liquid account from emergency goal for runway parity", () => {
    const now = new Date().toISOString();
    let ledger = emptyBudgetLedger(now);
    ledger = {
      ...ledger,
      goal: {
        id: "goal1",
        userId: "local",
        name: "Emergency",
        goalType: "emergency_reserve",
        targetAmountCents: 10_000_00,
        currentAmountCents: 6_000_00,
        targetDate: null,
        plannedMonthlyContributionCents: 0,
        linkedDecisionId: null,
        linkedAccountId: null,
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      transactions: [
        {
          id: "e1",
          userId: "local",
          type: "expense",
          status: "posted",
          amountCents: 2000_00,
          currency: "USD",
          description: "Life",
          merchantName: null,
          categoryId: "cat-other",
          accountId: null,
          transactionDate: "2026-08-01",
          postedAt: now,
          source: "manual",
          externalTransactionId: null,
          recurringRuleId: null,
          transferGroupId: null,
          parentTransactionId: null,
          isExcludedFromBudget: false,
          userNote: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ],
    };
    saveBudgetLedger(ledger);

    syncPlannerWithLedger();

    const acct = usePlannerStore.getState().accounts.find((a) => a.id === LEDGER_LIQUID_ACCOUNT_ID);
    expect(acct?.balance).toBe(6000);
  });
});
