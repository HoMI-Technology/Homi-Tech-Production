/**
 * Envelope / zero-based budgeting engine — pure arithmetic tests.
 *
 * Every case feeds the engine ledger facts (periods, posted transactions,
 * allocations) and asserts the derived numbers; no clocks, no storage.
 */

import { describe, expect, it } from "vitest";
import {
  applyRollover,
  computeEnvelopeState,
  computeReadyToAssign,
  detectOverspending,
  moveBetweenEnvelopes,
  suggestAutoFunding,
  type EnvelopeCategoryState,
} from "@/lib/finance/envelope";
import type {
  BudgetCategoryAllocation,
  BudgetPeriod,
  FinanceTransaction,
} from "@/lib/finance/ledger";

const PERIOD: BudgetPeriod = {
  id: "period-aug",
  userId: "user-1",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  expectedIncomeCents: null,
  goalReserveCents: 0,
  status: "open",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

let txSeq = 0;
function tx(overrides: Partial<FinanceTransaction>): FinanceTransaction {
  txSeq += 1;
  return {
    id: `tx-${txSeq}`,
    userId: "user-1",
    type: "expense",
    status: "posted",
    amountCents: 0,
    currency: "USD",
    description: "test",
    merchantName: null,
    categoryId: "cat-groceries",
    accountId: null,
    transactionDate: "2026-08-10",
    postedAt: null,
    source: "manual",
    externalTransactionId: null,
    recurringRuleId: null,
    transferGroupId: null,
    parentTransactionId: null,
    isExcludedFromBudget: false,
    userNote: null,
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

let allocSeq = 0;
function alloc(overrides: Partial<BudgetCategoryAllocation>): BudgetCategoryAllocation {
  allocSeq += 1;
  return {
    id: `alloc-${allocSeq}`,
    budgetPeriodId: PERIOD.id,
    categoryId: "cat-groceries",
    plannedCents: 0,
    rolloverMode: "none",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("applyRollover", () => {
  it("none never carries", () => {
    expect(applyRollover(50_000, "none")).toBe(0);
    expect(applyRollover(-20_000, "none")).toBe(0);
  });

  it("positive_only carries a surplus but not a deficit", () => {
    expect(applyRollover(50_000, "positive_only")).toBe(50_000);
    expect(applyRollover(-20_000, "positive_only")).toBe(0);
    expect(applyRollover(0, "positive_only")).toBe(0);
  });

  it("full carries in either direction", () => {
    expect(applyRollover(50_000, "full")).toBe(50_000);
    expect(applyRollover(-20_000, "full")).toBe(-20_000);
  });
});

describe("computeReadyToAssign", () => {
  it("is posted income minus assigned (zero-based)", () => {
    const result = computeReadyToAssign(
      PERIOD,
      [tx({ type: "income", amountCents: 650_000 })],
      [
        alloc({ categoryId: "cat-housing", plannedCents: 200_000 }),
        alloc({ categoryId: "cat-groceries", plannedCents: 60_000 }),
      ],
    );
    expect(result).toEqual({
      incomeCents: 650_000,
      assignedCents: 260_000,
      readyToAssignCents: 390_000,
    });
  });

  it("excludes pending, voided, deleted, out-of-period, and non-income rows", () => {
    const result = computeReadyToAssign(
      PERIOD,
      [
        tx({ type: "income", amountCents: 100_000 }),
        tx({ type: "income", amountCents: 50_000, status: "pending" }),
        tx({ type: "income", amountCents: 50_000, status: "voided" }),
        tx({ type: "income", amountCents: 50_000, deletedAt: "2026-08-11T00:00:00.000Z" }),
        tx({ type: "income", amountCents: 50_000, transactionDate: "2026-07-31" }),
        tx({ type: "income", amountCents: 50_000, transactionDate: "2026-09-01" }),
        tx({ type: "refund", amountCents: 5_000 }),
        tx({ type: "transfer", amountCents: 5_000 }),
      ],
      [],
    );
    expect(result.incomeCents).toBe(100_000);
    expect(result.readyToAssignCents).toBe(100_000);
  });

  it("goes negative when more is assigned than received (disclosed, not clamped)", () => {
    const result = computeReadyToAssign(
      PERIOD,
      [tx({ type: "income", amountCents: 10_000 })],
      [alloc({ plannedCents: 15_000 })],
    );
    expect(result.readyToAssignCents).toBe(-5_000);
  });

  it("ignores allocations belonging to other periods", () => {
    const result = computeReadyToAssign(
      PERIOD,
      [tx({ type: "income", amountCents: 100_000 })],
      [
        alloc({ plannedCents: 40_000 }),
        alloc({ budgetPeriodId: "period-sep", plannedCents: 999_000 }),
      ],
    );
    expect(result.assignedCents).toBe(40_000);
  });

  it("empty period is zero, not invented", () => {
    const result = computeReadyToAssign(PERIOD, [], []);
    expect(result).toEqual({ incomeCents: 0, assignedCents: 0, readyToAssignCents: 0 });
  });
});

describe("computeEnvelopeState", () => {
  it("derives assigned, activity, and available per category", () => {
    const allocations = [
      alloc({ categoryId: "cat-groceries", plannedCents: 60_000 }),
      alloc({ categoryId: "cat-dining", plannedCents: 20_000 }),
    ];
    const transactions = [
      tx({ categoryId: "cat-groceries", amountCents: 45_000 }),
      tx({ categoryId: "cat-dining", amountCents: 25_000 }),
      tx({ categoryId: "cat-dining", type: "refund", amountCents: 5_000 }),
    ];
    const state = computeEnvelopeState(PERIOD, allocations, transactions);
    const groceries = state.find((s) => s.categoryId === "cat-groceries")!;
    const dining = state.find((s) => s.categoryId === "cat-dining")!;
    expect(groceries.availableCents).toBe(15_000);
    expect(groceries.overspent).toBe(false);
    expect(groceries.utilization).toBeCloseTo(0.75);
    expect(dining.activityCents).toBe(20_000); // refund nets against expense
    expect(dining.availableCents).toBe(0);
  });

  it("flags overspending and reports its magnitude", () => {
    const state = computeEnvelopeState(
      PERIOD,
      [alloc({ categoryId: "cat-dining", plannedCents: 20_000 })],
      [tx({ categoryId: "cat-dining", amountCents: 27_500 })],
    );
    expect(state[0].overspent).toBe(true);
    expect(state[0].overspentCents).toBe(7_500);
    expect(state[0].availableCents).toBe(-7_500);
  });

  it("applies rollover from the prior period per mode", () => {
    const allocations = [
      alloc({ categoryId: "cat-a", plannedCents: 10_000, rolloverMode: "full" }),
      alloc({ categoryId: "cat-b", plannedCents: 10_000, rolloverMode: "positive_only" }),
      alloc({ categoryId: "cat-c", plannedCents: 10_000, rolloverMode: "none" }),
      alloc({ categoryId: "cat-d", plannedCents: 10_000, rolloverMode: "positive_only" }),
    ];
    const prior = new Map([
      ["cat-a", -4_000],
      ["cat-b", 6_000],
      ["cat-c", 6_000],
      ["cat-d", -4_000],
    ]);
    const state = computeEnvelopeState(PERIOD, allocations, [], prior);
    const byId = Object.fromEntries(state.map((s) => [s.categoryId, s]));
    expect(byId["cat-a"].availableCents).toBe(6_000);
    expect(byId["cat-b"].availableCents).toBe(16_000);
    expect(byId["cat-c"].availableCents).toBe(10_000);
    expect(byId["cat-d"].availableCents).toBe(10_000);
  });

  it("excludes pending transactions from activity", () => {
    const state = computeEnvelopeState(
      PERIOD,
      [alloc({ categoryId: "cat-groceries", plannedCents: 60_000 })],
      [
        tx({ amountCents: 10_000 }),
        tx({ amountCents: 99_000, status: "pending" }),
        tx({ amountCents: 99_000, deletedAt: "2026-08-11T00:00:00.000Z" }),
        tx({ amountCents: 99_000, isExcludedFromBudget: true }),
      ],
    );
    expect(state[0].activityCents).toBe(10_000);
  });

  it("gives a zero-assignment category with spending a null utilization, not Infinity", () => {
    const state = computeEnvelopeState(
      PERIOD,
      [alloc({ categoryId: "cat-other", plannedCents: 0 })],
      [tx({ categoryId: "cat-other", amountCents: 5_000 })],
    );
    expect(state[0].utilization).toBeNull();
    expect(state[0].overspent).toBe(true);
  });

  it("ignores allocations and transactions outside the period", () => {
    const state = computeEnvelopeState(
      PERIOD,
      [
        alloc({ categoryId: "cat-groceries", plannedCents: 60_000 }),
        alloc({ budgetPeriodId: "period-sep", categoryId: "cat-sep", plannedCents: 1_000 }),
      ],
      [tx({ amountCents: 10_000 }), tx({ amountCents: 50_000, transactionDate: "2026-09-02" })],
    );
    expect(state).toHaveLength(1);
    expect(state[0].activityCents).toBe(10_000);
  });

  it("handles an empty period with no transactions or allocations", () => {
    expect(computeEnvelopeState(PERIOD, [], [])).toEqual([]);
  });

  it("orders most-overspent first for stable rendering", () => {
    const state = computeEnvelopeState(
      PERIOD,
      [
        alloc({ categoryId: "cat-ok", plannedCents: 50_000 }),
        alloc({ categoryId: "cat-over", plannedCents: 10_000 }),
      ],
      [
        tx({ categoryId: "cat-over", amountCents: 20_000 }),
        tx({ categoryId: "cat-ok", amountCents: 25_000 }),
      ],
    );
    expect(state.map((s) => s.categoryId)).toEqual(["cat-over", "cat-ok"]);
  });
});

describe("detectOverspending", () => {
  const state: EnvelopeCategoryState[] = [
    {
      categoryId: "cat-over",
      assignedCents: 10_000,
      activityCents: 15_000,
      rolloverAppliedCents: 0,
      availableCents: -5_000,
      overspent: true,
      overspentCents: 5_000,
      utilization: 1.5,
    },
    {
      categoryId: "cat-fine",
      assignedCents: 10_000,
      activityCents: 9_000,
      rolloverAppliedCents: 0,
      availableCents: 1_000,
      overspent: false,
      overspentCents: 0,
      utilization: 0.9,
    },
    {
      categoryId: "cat-exact",
      assignedCents: 10_000,
      activityCents: 10_000,
      rolloverAppliedCents: 0,
      availableCents: 0,
      overspent: false,
      overspentCents: 0,
      utilization: 1,
    },
  ];

  it("lists only envelopes over 100% of their available funds", () => {
    const overspent = detectOverspending(state);
    expect(overspent).toEqual([
      {
        categoryId: "cat-over",
        assignedCents: 10_000,
        activityCents: 15_000,
        overspentCents: 5_000,
      },
    ]);
  });

  it("exactly-100% utilization is not overspent", () => {
    expect(detectOverspending(state).some((o) => o.categoryId === "cat-exact")).toBe(false);
  });

  it("empty state yields no overspending", () => {
    expect(detectOverspending([])).toEqual([]);
  });
});

describe("suggestAutoFunding", () => {
  const targets = [
    { categoryId: "cat-housing", targetCents: 200_000, priority: 1 },
    { categoryId: "cat-groceries", targetCents: 60_000, priority: 2 },
    { categoryId: "cat-fun", targetCents: 40_000, priority: 3 },
  ];

  it("priority funds fully in order, partial on the last reachable target", () => {
    const deltas = suggestAutoFunding(targets, 230_000, "priority");
    expect(deltas).toEqual([
      { categoryId: "cat-housing", deltaCents: 200_000 },
      { categoryId: "cat-groceries", deltaCents: 30_000 },
    ]);
    expect(deltas.reduce((s, d) => s + d.deltaCents, 0)).toBe(230_000);
  });

  it("priority never exceeds readyToAssign", () => {
    const deltas = suggestAutoFunding(targets, 1_000_000, "priority");
    expect(deltas.reduce((s, d) => s + d.deltaCents, 0)).toBe(300_000);
  });

  it("proportional splits by target size and lands exactly on the budget", () => {
    const deltas = suggestAutoFunding(targets, 150_000, "proportional");
    const byId = Object.fromEntries(deltas.map((d) => [d.categoryId, d.deltaCents]));
    expect(byId["cat-housing"]).toBe(100_000);
    expect(byId["cat-groceries"]).toBe(30_000);
    expect(byId["cat-fun"]).toBe(20_000);
  });

  it("proportional distributes flooring remainder deterministically in priority order", () => {
    const odd = [
      { categoryId: "cat-a", targetCents: 100, priority: 1 },
      { categoryId: "cat-b", targetCents: 100, priority: 2 },
      { categoryId: "cat-c", targetCents: 100, priority: 3 },
    ];
    // ratio = 1/3 → floor(33.33) = 33 each, remainder 1 goes to highest priority.
    const deltas = suggestAutoFunding(odd, 100, "proportional");
    expect(deltas).toEqual([
      { categoryId: "cat-a", deltaCents: 34 },
      { categoryId: "cat-b", deltaCents: 33 },
      { categoryId: "cat-c", deltaCents: 33 },
    ]);
    expect(deltas.reduce((s, d) => s + d.deltaCents, 0)).toBe(100);
  });

  it("proportional with more funds than targets caps at the targets", () => {
    const deltas = suggestAutoFunding(targets, 999_999, "proportional");
    expect(deltas.reduce((s, d) => s + d.deltaCents, 0)).toBe(300_000);
  });

  it("returns nothing when there is nothing to assign or no targets", () => {
    expect(suggestAutoFunding(targets, 0, "priority")).toEqual([]);
    expect(suggestAutoFunding(targets, -5_000, "proportional")).toEqual([]);
    expect(suggestAutoFunding([], 10_000, "priority")).toEqual([]);
    expect(suggestAutoFunding([], 10_000, "proportional")).toEqual([]);
  });

  it("proportional with all-zero targets returns nothing", () => {
    const zeros = [
      { categoryId: "cat-a", targetCents: 0, priority: 1 },
      { categoryId: "cat-b", targetCents: 0, priority: 2 },
    ];
    expect(suggestAutoFunding(zeros, 10_000, "proportional")).toEqual([]);
  });

  it("is deterministic for equal-priority ties (category id order)", () => {
    const ties = [
      { categoryId: "cat-b", targetCents: 10_000, priority: 1 },
      { categoryId: "cat-a", targetCents: 10_000, priority: 1 },
    ];
    const first = suggestAutoFunding(ties, 15_000, "priority");
    expect(first).toEqual([
      { categoryId: "cat-a", deltaCents: 10_000 },
      { categoryId: "cat-b", deltaCents: 5_000 },
    ]);
  });
});

describe("moveBetweenEnvelopes", () => {
  const allocations = [
    alloc({ id: "alloc-a", categoryId: "cat-a", plannedCents: 50_000 }),
    alloc({ id: "alloc-b", categoryId: "cat-b", plannedCents: 10_000 }),
  ];

  it("moves cents from source to destination without mutating inputs", () => {
    const next = moveBetweenEnvelopes(allocations, "cat-a", "cat-b", 20_000);
    expect(next.find((a) => a.categoryId === "cat-a")!.plannedCents).toBe(30_000);
    expect(next.find((a) => a.categoryId === "cat-b")!.plannedCents).toBe(30_000);
    expect(allocations[0].plannedCents).toBe(50_000); // untouched
  });

  it("allows draining the source exactly to zero", () => {
    const next = moveBetweenEnvelopes(allocations, "cat-a", "cat-b", 50_000);
    expect(next.find((a) => a.categoryId === "cat-a")!.plannedCents).toBe(0);
  });

  it("rejects a move that would make the source negative", () => {
    expect(() => moveBetweenEnvelopes(allocations, "cat-a", "cat-b", 50_001)).toThrow(RangeError);
  });

  it("rejects non-positive and non-integer amounts", () => {
    expect(() => moveBetweenEnvelopes(allocations, "cat-a", "cat-b", 0)).toThrow(RangeError);
    expect(() => moveBetweenEnvelopes(allocations, "cat-a", "cat-b", -1)).toThrow(RangeError);
    expect(() => moveBetweenEnvelopes(allocations, "cat-a", "cat-b", 1.5)).toThrow(RangeError);
  });

  it("rejects missing envelopes, self-moves, and cross-period moves", () => {
    expect(() => moveBetweenEnvelopes(allocations, "cat-a", "cat-zz", 100)).toThrow(RangeError);
    expect(() => moveBetweenEnvelopes(allocations, "cat-a", "cat-a", 100)).toThrow(RangeError);
    const cross = [
      ...allocations,
      alloc({ id: "alloc-c", budgetPeriodId: "period-sep", categoryId: "cat-c", plannedCents: 0 }),
    ];
    expect(() => moveBetweenEnvelopes(cross, "cat-a", "cat-c", 100)).toThrow(RangeError);
  });
});
