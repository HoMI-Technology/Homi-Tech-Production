import { describe, expect, it } from "vitest";
import {
  contributionSplit,
  goalRow,
  goalRows,
  goalTotals,
} from "@/components/planner/goals/goals-derive";
import type { SavingsGoal } from "@/lib/finance/ledger";

const FROM = "2026-08-01";

function goal(over: Partial<SavingsGoal> & { id: string }): SavingsGoal {
  return {
    userId: "local",
    name: "Goal",
    goalType: "custom",
    targetAmountCents: 10_000_00,
    currentAmountCents: 0,
    targetDate: null,
    plannedMonthlyContributionCents: 0,
    linkedDecisionId: null,
    linkedAccountId: null,
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  } as SavingsGoal;
}

describe("goalRow", () => {
  it("reports progress as a capped percentage", () => {
    const r = goalRow(goal({ id: "a", currentAmountCents: 2_500_00 }), FROM);
    expect(r.pct).toBe(25);
    expect(r.funded).toBe(false);
  });

  it("caps an over-funded goal at 100 rather than reporting 130%", () => {
    const r = goalRow(goal({ id: "a", currentAmountCents: 13_000_00 }), FROM);
    expect(r.pct).toBe(100);
    expect(r.funded).toBe(true);
  });

  /**
   * A goal with no target date is unplanned, not failing. Colouring it as
   * behind would invent a deadline the user never set.
   */
  it("is not 'behind' when there is no target date", () => {
    const r = goalRow(
      goal({ id: "a", currentAmountCents: 0, plannedMonthlyContributionCents: 0 }),
      FROM,
    );
    expect(r.behind).toBe(false);
  });

  it("is behind when the planned pace misses a real target date", () => {
    const r = goalRow(
      goal({
        id: "a",
        currentAmountCents: 0,
        targetDate: "2026-12-01",
        plannedMonthlyContributionCents: 100_00,
      }),
      FROM,
    );
    // 10,000 over ~4 months needs far more than 100/mo.
    expect(r.behind).toBe(true);
  });

  it("is never behind once funded, whatever the date says", () => {
    const r = goalRow(
      goal({
        id: "a",
        currentAmountCents: 10_000_00,
        targetDate: "2026-08-02",
        plannedMonthlyContributionCents: 0,
      }),
      FROM,
    );
    expect(r.funded).toBe(true);
    expect(r.behind).toBe(false);
  });
});

describe("goalRows", () => {
  it("skips non-active goals", () => {
    const rows = goalRows(
      [goal({ id: "a" }), goal({ id: "b", status: "archived" }), goal({ id: "c" })],
      FROM,
    );
    expect(rows.map((r) => r.goal.id)).toEqual(["a", "c"]);
  });
});

describe("goalTotals", () => {
  it("aggregates saved, target and monthly across active goals", () => {
    const totals = goalTotals([
      goal({
        id: "a",
        currentAmountCents: 1_000_00,
        targetAmountCents: 4_000_00,
        plannedMonthlyContributionCents: 50_00,
      }),
      goal({
        id: "b",
        currentAmountCents: 3_000_00,
        targetAmountCents: 6_000_00,
        plannedMonthlyContributionCents: 25_00,
      }),
      goal({ id: "old", status: "archived", currentAmountCents: 9_000_00 }),
    ]);

    expect(totals.count).toBe(2);
    expect(totals.savedCents).toBe(4_000_00);
    expect(totals.targetCents).toBe(10_000_00);
    expect(totals.pct).toBe(40);
    expect(totals.monthlyContributionCents).toBe(75_00);
  });

  it("returns zeroes without NaN for an empty set", () => {
    expect(goalTotals([])).toEqual({
      count: 0,
      savedCents: 0,
      targetCents: 0,
      pct: 0,
      monthlyContributionCents: 0,
    });
  });
});

describe("contributionSplit", () => {
  it("splits the monthly total into shares that sum to ~100", () => {
    const split = contributionSplit([
      goal({ id: "a", name: "House", plannedMonthlyContributionCents: 75_00 }),
      goal({ id: "b", name: "Reserve", plannedMonthlyContributionCents: 25_00 }),
    ]);
    expect(split.map((s) => s.pct)).toEqual([75, 25]);
    expect(split.map((s) => s.name)).toEqual(["House", "Reserve"]);
  });

  it("omits goals contributing nothing", () => {
    const split = contributionSplit([
      goal({ id: "a", plannedMonthlyContributionCents: 100_00 }),
      goal({ id: "b", plannedMonthlyContributionCents: 0 }),
    ]);
    expect(split).toHaveLength(1);
  });

  /** Equal slices of nothing would imply funding that is not happening. */
  it("returns an empty split when nothing is being contributed", () => {
    expect(
      contributionSplit([
        goal({ id: "a", plannedMonthlyContributionCents: 0 }),
        goal({ id: "b", plannedMonthlyContributionCents: 0 }),
      ]),
    ).toEqual([]);
  });
});
