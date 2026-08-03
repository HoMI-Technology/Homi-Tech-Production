import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addManualTransaction,
  emptyBudgetLedger,
  ensurePeriodFor,
  hasSavedBudgetLedger,
  loadBudgetLedger,
  monthBoundsFor,
  saveBudgetLedger,
  seedCategories,
  setGoalReserve,
  setPlannedAllocation,
  softDeleteTransaction,
  todayDateOnly,
  upsertGoal,
  type BudgetLedgerState,
} from "@/lib/finance/local-ledger";
import { summarizePeriod } from "@/lib/finance/calculations";

const NOW = "2026-08-03T12:00:00.000Z";

function seeded(): BudgetLedgerState {
  return emptyBudgetLedger(NOW);
}

function withPeriod(): { state: BudgetLedgerState; periodId: string } {
  const { state, period } = ensurePeriodFor(seeded(), "2026-08-03", NOW);
  return { state, periodId: period.id };
}

describe("monthBoundsFor", () => {
  it("computes calendar-month bounds", () => {
    expect(monthBoundsFor("2026-08-03")).toEqual({
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
    });
  });

  it("handles February in a leap year and December", () => {
    expect(monthBoundsFor("2028-02-15").periodEnd).toBe("2028-02-29");
    expect(monthBoundsFor("2026-02-01").periodEnd).toBe("2026-02-28");
    expect(monthBoundsFor("2026-12-31")).toEqual({
      periodStart: "2026-12-01",
      periodEnd: "2026-12-31",
    });
  });
});

describe("todayDateOnly", () => {
  it("uses the local calendar, zero-padded", () => {
    expect(todayDateOnly(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("seedCategories", () => {
  it("is deterministic: slug-derived ids, both category types", () => {
    const cats = seedCategories(NOW);
    const housing = cats.find((c) => c.slug === "housing");
    expect(housing).toMatchObject({
      id: "cat-housing",
      categoryType: "expense",
      essentiality: "required",
      isSystem: true,
    });
    expect(cats.some((c) => c.categoryType === "income")).toBe(true);
    expect(new Set(cats.map((c) => c.id)).size).toBe(cats.length);
  });
});

describe("ensurePeriodFor", () => {
  it("creates the month period once and reuses it after", () => {
    const first = ensurePeriodFor(seeded(), "2026-08-03", NOW);
    expect(first.period).toMatchObject({
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      goalReserveCents: 0,
      status: "open",
    });
    const second = ensurePeriodFor(first.state, "2026-08-20", NOW);
    expect(second.state).toBe(first.state);
    expect(second.period.id).toBe(first.period.id);
  });
});

describe("addManualTransaction", () => {
  it("appends a posted manual row", () => {
    const state = addManualTransaction(
      seeded(),
      {
        type: "expense",
        amountCents: 4550,
        description: "  Groceries ",
        categoryId: "cat-groceries",
        transactionDate: "2026-08-02",
      },
      NOW,
    );
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0]).toMatchObject({
      type: "expense",
      status: "posted",
      source: "manual",
      amountCents: 4550,
      description: "Groceries",
      deletedAt: null,
    });
  });

  it("mirrors the validation invariants", () => {
    const base = seeded();
    expect(() =>
      addManualTransaction(
        base,
        { type: "expense", amountCents: 100, description: "x", categoryId: null, transactionDate: "2026-08-02" },
        NOW,
      ),
    ).toThrow(/category/i);
    expect(() =>
      addManualTransaction(
        base,
        { type: "transfer", amountCents: 100, description: "x", categoryId: "cat-other", transactionDate: "2026-08-02" },
        NOW,
      ),
    ).toThrow(/not categorized/i);
    expect(() =>
      addManualTransaction(
        base,
        { type: "income", amountCents: 0, description: "x", categoryId: null, transactionDate: "2026-08-02" },
        NOW,
      ),
    ).toThrow(RangeError);
    expect(() =>
      addManualTransaction(
        base,
        { type: "income", amountCents: 10.5, description: "x", categoryId: null, transactionDate: "2026-08-02" },
        NOW,
      ),
    ).toThrow(RangeError);
  });
});

describe("softDeleteTransaction", () => {
  it("removes the row from period math but keeps it for audit", () => {
    const { state, periodId } = withPeriod();
    let next = addManualTransaction(
      state,
      { type: "income", amountCents: 500000, description: "Paycheck", categoryId: null, transactionDate: "2026-08-01" },
      NOW,
    );
    const txId = next.transactions[0].id;
    next = softDeleteTransaction(next, txId, "2026-08-03T13:00:00.000Z");

    expect(next.transactions).toHaveLength(1);
    expect(next.transactions[0].deletedAt).not.toBeNull();

    const period = next.periods.find((p) => p.id === periodId)!;
    expect(summarizePeriod(next.transactions, period).incomeCents).toBe(0);
  });
});

describe("setPlannedAllocation", () => {
  it("upserts and removes on zero", () => {
    const { state, periodId } = withPeriod();
    let next = setPlannedAllocation(state, periodId, "cat-groceries", 60000, NOW);
    expect(next.allocations).toHaveLength(1);
    expect(next.allocations[0].plannedCents).toBe(60000);

    next = setPlannedAllocation(next, periodId, "cat-groceries", 75000, NOW);
    expect(next.allocations).toHaveLength(1);
    expect(next.allocations[0].plannedCents).toBe(75000);

    next = setPlannedAllocation(next, periodId, "cat-groceries", 0, NOW);
    expect(next.allocations).toHaveLength(0);
  });
});

describe("setGoalReserve", () => {
  it("updates the target period only and rejects negatives", () => {
    const { state, periodId } = withPeriod();
    const next = setGoalReserve(state, periodId, 25000, NOW);
    expect(next.periods.find((p) => p.id === periodId)!.goalReserveCents).toBe(25000);
    expect(() => setGoalReserve(state, periodId, -1, NOW)).toThrow(RangeError);
  });
});

describe("upsertGoal", () => {
  const input = {
    name: "Emergency reserve",
    goalType: "emergency_reserve" as const,
    targetAmountCents: 1_000_000,
    currentAmountCents: 250_000,
    plannedMonthlyContributionCents: 50_000,
    targetDate: null,
  };

  it("creates then updates the single goal, keeping its id", () => {
    let state = upsertGoal(seeded(), input, NOW);
    expect(state.goal).toMatchObject({ name: "Emergency reserve", status: "active" });
    const id = state.goal!.id;

    state = upsertGoal(state, { ...input, currentAmountCents: 300_000 }, NOW);
    expect(state.goal!.id).toBe(id);
    expect(state.goal!.currentAmountCents).toBe(300_000);
  });

  it("rejects invalid amounts", () => {
    expect(() => upsertGoal(seeded(), { ...input, targetAmountCents: 0 }, NOW)).toThrow(RangeError);
    expect(() => upsertGoal(seeded(), { ...input, currentAmountCents: -5 }, NOW)).toThrow(RangeError);
  });
});

describe("storage layer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("is SSR-safe without a window", () => {
    expect(hasSavedBudgetLedger()).toBe(false);
    expect(loadBudgetLedger(NOW).transactions).toEqual([]);
    expect(() => saveBudgetLedger(seeded())).not.toThrow();
  });

  it("round-trips through localStorage", () => {
    stubStorage();
    expect(hasSavedBudgetLedger()).toBe(false);

    const state = addManualTransaction(
      seeded(),
      { type: "income", amountCents: 650000, description: "Paycheck", categoryId: "cat-payroll", transactionDate: "2026-08-01" },
      NOW,
    );
    saveBudgetLedger(state);

    expect(hasSavedBudgetLedger()).toBe(true);
    const loaded = loadBudgetLedger(NOW);
    expect(loaded.transactions).toHaveLength(1);
    expect(loaded.transactions[0].amountCents).toBe(650000);
    expect(loaded.categories.length).toBeGreaterThan(0);
  });

  it("falls back to the empty seed on corrupted storage", () => {
    const backing = stubStorage();
    backing.set("homi:budget-ledger", "{not json");
    const loaded = loadBudgetLedger(NOW);
    expect(loaded.transactions).toEqual([]);
    expect(loaded.categories.length).toBeGreaterThan(0);
  });
});
