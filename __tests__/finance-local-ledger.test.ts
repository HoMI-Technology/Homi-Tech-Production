import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activeGoal,
  addManualTransaction,
  archiveGoal,
  elapsedFraction,
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
        {
          type: "expense",
          amountCents: 100,
          description: "x",
          categoryId: null,
          transactionDate: "2026-08-02",
        },
        NOW,
      ),
    ).toThrow(/category/i);
    expect(() =>
      addManualTransaction(
        base,
        {
          type: "transfer",
          amountCents: 100,
          description: "x",
          categoryId: "cat-other",
          transactionDate: "2026-08-02",
        },
        NOW,
      ),
    ).toThrow(/not categorized/i);
    expect(() =>
      addManualTransaction(
        base,
        {
          type: "income",
          amountCents: 0,
          description: "x",
          categoryId: null,
          transactionDate: "2026-08-02",
        },
        NOW,
      ),
    ).toThrow(RangeError);
    expect(() =>
      addManualTransaction(
        base,
        {
          type: "income",
          amountCents: 10.5,
          description: "x",
          categoryId: null,
          transactionDate: "2026-08-02",
        },
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
      {
        type: "income",
        amountCents: 500000,
        description: "Paycheck",
        categoryId: null,
        transactionDate: "2026-08-01",
      },
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

  it("updates in place when given the goal's id", () => {
    let state = upsertGoal(seeded(), input, NOW);
    expect(state.goals[0]).toMatchObject({ name: "Emergency reserve", status: "active" });
    const id = state.goals[0]!.id;

    state = upsertGoal(state, { ...input, id, currentAmountCents: 300_000 }, NOW);
    expect(state.goals).toHaveLength(1);
    expect(state.goals[0]!.id).toBe(id);
    expect(state.goals[0]!.currentAmountCents).toBe(300_000);
  });

  /**
   * The contract change from the one-goal model: without an id there is no
   * "the" goal to update, so a second call adds a second goal rather than
   * silently overwriting the first. Callers that mean "edit this one" must say
   * which one.
   */
  it("creates a second goal when no id is given", () => {
    let state = upsertGoal(seeded(), input, NOW);
    state = upsertGoal(state, { ...input, name: "House deposit", goalType: "home" }, NOW);

    expect(state.goals).toHaveLength(2);
    expect(state.goals.map((g) => g.name)).toEqual(["Emergency reserve", "House deposit"]);
    expect(new Set(state.goals.map((g) => g.id)).size).toBe(2);
  });

  it("rejects invalid amounts", () => {
    expect(() => upsertGoal(seeded(), { ...input, targetAmountCents: 0 }, NOW)).toThrow(RangeError);
    expect(() => upsertGoal(seeded(), { ...input, currentAmountCents: -5 }, NOW)).toThrow(
      RangeError,
    );
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
      {
        type: "income",
        amountCents: 650000,
        description: "Paycheck",
        categoryId: "cat-payroll",
        transactionDate: "2026-08-01",
      },
      NOW,
    );
    saveBudgetLedger(state);

    expect(hasSavedBudgetLedger()).toBe(true);
    const loaded = loadBudgetLedger(NOW);
    expect(loaded.transactions).toHaveLength(1);
    expect(loaded.transactions[0].amountCents).toBe(650000);
    expect(loaded.categories.length).toBeGreaterThan(0);
  });

  it("falls back to the empty seed on corrupted storage, preserving a backup", () => {
    const backing = stubStorage();
    backing.set("homi:budget-ledger", "{not json");
    const loaded = loadBudgetLedger(NOW);
    expect(loaded.transactions).toEqual([]);
    expect(loaded.categories.length).toBeGreaterThan(0);
    // The unreadable blob is moved aside, never destroyed.
    expect(backing.get("homi:budget-ledger:corrupt-backup")).toBe("{not json");
  });

  it("drops rows that would crash the calculation layer, keeps usable ones", () => {
    const backing = stubStorage();
    const good = addManualTransaction(
      seeded(),
      {
        type: "income",
        amountCents: 100_00,
        description: "ok",
        categoryId: null,
        transactionDate: "2026-08-01",
      },
      NOW,
    ).transactions[0];
    const poisoned = {
      schemaVersion: 1,
      categories: seedCategories(NOW),
      transactions: [good, { ...good, id: "bad", amountCents: 10.5 }, "garbage"],
      periods: [{ nope: true }],
      allocations: [{ id: "a", budgetPeriodId: "p", categoryId: "c", plannedCents: NaN }],
      goals: [{ id: "g", name: "broken", targetAmountCents: "lots" }],
    };
    backing.set("homi:budget-ledger", JSON.stringify(poisoned));

    const loaded = loadBudgetLedger(NOW);
    expect(loaded.transactions).toHaveLength(1);
    expect(loaded.transactions[0].id).toBe(good.id);
    expect(loaded.periods).toEqual([]);
    expect(loaded.allocations).toEqual([]);
    expect(loaded.goals).toHaveLength(0);
    // The survivors must be safe to hand to summarizePeriod.
    const { period } = ensurePeriodFor(loaded, "2026-08-03", NOW);
    expect(summarizePeriod(loaded.transactions, period).incomeCents).toBe(100_00);
  });

  it("reports save failure instead of swallowing it (Safari private mode)", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new DOMException("QuotaExceededError");
        },
        removeItem: () => undefined,
      },
    });
    expect(saveBudgetLedger(seeded())).toBe(false);
  });
});

describe("elapsedFraction", () => {
  const AUGUST = { periodStart: "2026-08-01", periodEnd: "2026-08-31" };

  it("is proportional within the month and clamped outside it", () => {
    expect(elapsedFraction(AUGUST, "2026-08-01")).toBeCloseTo(1 / 31);
    expect(elapsedFraction(AUGUST, "2026-08-31")).toBe(1);
    expect(elapsedFraction(AUGUST, "2026-07-15")).toBe(0);
    expect(elapsedFraction(AUGUST, "2026-09-01")).toBe(1);
  });
});

describe("goal lifecycle", () => {
  const input = {
    name: "Down payment",
    goalType: "home" as const,
    targetAmountCents: 6_000_000,
    currentAmountCents: 1_000_000,
    plannedMonthlyContributionCents: 100_000,
    targetDate: null,
  };

  it("archiveGoal hides the goal and a new upsert creates a fresh record", () => {
    let state = upsertGoal(seeded(), input, NOW);
    const firstId = state.goals[0]!.id;
    expect(activeGoal(state)!.id).toBe(firstId);

    state = archiveGoal(state, NOW);
    expect(activeGoal(state)).toBeNull();
    expect(state.goals[0]!.status).toBe("archived");

    state = upsertGoal(state, { ...input, name: "New goal" }, NOW);
    expect(activeGoal(state)!.name).toBe("New goal");
    expect(activeGoal(state)!.id).not.toBe(firstId);
  });

  it("archiveGoal is a no-op without an active goal", () => {
    expect(archiveGoal(seeded(), NOW)).toEqual(seeded());
  });
});
