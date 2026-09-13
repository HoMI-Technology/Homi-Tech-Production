/**
 * Leftover sample wipe — persisted first-visit demo must not stay as live money.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptyBudgetLedger,
  hasSavedBudgetLedger,
  loadBudgetLedger,
  saveBudgetLedger,
} from "@/lib/finance/local-ledger";
import { dollarsToCents } from "@/lib/finance/money";
import { buildDemoSeed } from "@/lib/planner/derived";
import {
  DEMO_TX_FINGERPRINTS,
  ledgerLooksLikeDemo,
  scrubPersistedDemoWorkspace,
} from "@/lib/planner/demo-ledger-scrub";
import { syncPlannerWithLedger } from "@/lib/planner/ledger-bridge";
import { usePlannerStore } from "@/lib/planner/store";

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

describe("scrubPersistedDemoWorkspace", () => {
  beforeEach(() => {
    stubStorage();
    usePlannerStore.setState({
      demoWorkspace: false,
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

  it("stays aligned with buildDemoSeed notes and amounts", () => {
    const seed = buildDemoSeed(new Date("2031-01-02T12:00:00"));
    const notes = new Set(DEMO_TX_FINGERPRINTS.map((row) => `${row.note}:${row.amount}`));
    for (const tx of seed.transactions) {
      expect(notes.has(`${tx.note}:${tx.amount}`)).toBe(true);
    }
  });

  it("clears a flagged demo planner and does not leave a ledger", () => {
    const seed = buildDemoSeed(new Date("2031-01-02T12:00:00"));
    usePlannerStore.setState({
      demoWorkspace: true,
      transactions: seed.transactions,
      accounts: seed.accounts,
      bills: seed.bills,
      holdings: seed.holdings,
      netWorthItems: seed.netWorthItems,
    });

    expect(scrubPersistedDemoWorkspace()).toBe(true);
    const next = usePlannerStore.getState();
    expect(next.demoWorkspace).toBe(false);
    expect(next.transactions).toEqual([]);
    expect(next.accounts).toEqual([]);
    expect(hasSavedBudgetLedger()).toBe(false);
  });

  it("clears Chase demo accounts even when demoWorkspace is false", () => {
    usePlannerStore.setState({
      demoWorkspace: false,
      transactions: [
        {
          id: "tx-demo-01",
          type: "expense",
          amount: 42,
          category: "food",
          note: "Coffee runs",
          date: "2026-08-01",
          source: "manual",
        },
      ],
      accounts: [
        {
          id: "acct-demo-checking",
          institution: "chase",
          name: "Total Checking",
          type: "checking",
          mask: "4821",
          balance: 4280.42,
          available: 4120,
          currency: "USD",
          lastSyncedAt: null,
          status: "linked",
        },
      ],
    });

    expect(scrubPersistedDemoWorkspace()).toBe(true);
    expect(usePlannerStore.getState().transactions).toEqual([]);
  });

  it("wipes a ledger that was adopted from demo fingerprints", () => {
    const now = new Date().toISOString();
    const ledger = emptyBudgetLedger(now);
    ledger.transactions = DEMO_TX_FINGERPRINTS.map((row, i) => ({
      id: `uuid-${i}`,
      userId: "local",
      type: row.amount >= 400 ? "income" : "expense",
      status: "posted",
      amountCents: dollarsToCents(row.amount),
      currency: "USD",
      description: row.note,
      merchantName: null,
      categoryId: "cat-food",
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
    }));
    saveBudgetLedger(ledger);
    expect(ledgerLooksLikeDemo(ledger.transactions)).toBe(true);

    expect(scrubPersistedDemoWorkspace()).toBe(true);
    expect(hasSavedBudgetLedger()).toBe(true);
    expect(loadBudgetLedger("2026-08-01").transactions).toEqual([]);
  });

  it("leaves real typed money alone", () => {
    usePlannerStore.setState({
      demoWorkspace: false,
      transactions: [
        {
          id: "tx_manual1",
          type: "income",
          amount: 4000,
          category: "salary",
          note: "My paycheck",
          date: "2026-08-01",
          source: "manual",
        },
      ],
      accounts: [],
    });
    const now = new Date().toISOString();
    const ledger = emptyBudgetLedger(now);
    ledger.transactions = [
      {
        id: "real-1",
        userId: "local",
        type: "income",
        status: "posted",
        amountCents: 400000,
        currency: "USD",
        description: "My paycheck",
        merchantName: null,
        categoryId: "cat-salary",
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
    ];
    saveBudgetLedger(ledger);

    expect(scrubPersistedDemoWorkspace()).toBe(false);
    expect(usePlannerStore.getState().transactions).toHaveLength(1);
    expect(loadBudgetLedger("2026-08-01").transactions).toHaveLength(1);
  });

  it("syncPlannerWithLedger wipes leftover demo before adopting", () => {
    const seed = buildDemoSeed(new Date("2031-01-02T12:00:00"));
    usePlannerStore.setState({
      demoWorkspace: true,
      transactions: seed.transactions,
      accounts: seed.accounts,
    });
    syncPlannerWithLedger();
    expect(usePlannerStore.getState().transactions).toEqual([]);
    expect(hasSavedBudgetLedger()).toBe(false);
  });
});
