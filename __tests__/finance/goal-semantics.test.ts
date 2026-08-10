/**
 * The rulings that decide what a set of goals means for the money picture.
 * These are the answers that used to be inlined in four modules and had already
 * drifted apart, so they are pinned here.
 */

import { describe, expect, it } from "vitest";
import {
  activeGoals,
  downPaymentProgress,
  goalsOfType,
  liquidSavingsCents,
  primaryGoal,
} from "@/lib/finance/goal-semantics";
import type { SavingsGoal } from "@/lib/finance/ledger";

function goal(over: Partial<SavingsGoal> & { id: string }): SavingsGoal {
  return {
    userId: "local",
    name: "Goal",
    goalType: "custom",
    targetAmountCents: 1_000_00,
    currentAmountCents: 0,
    targetDate: null,
    plannedMonthlyContributionCents: 0,
    linkedDecisionId: null,
    linkedAccountId: null,
    status: "active",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...over,
  } as SavingsGoal;
}

describe("activeGoals", () => {
  it("counts only active goals — paused and archived are history", () => {
    const goals = [
      goal({ id: "a" }),
      goal({ id: "b", status: "archived" }),
      goal({ id: "c", status: "paused" }),
      goal({ id: "d", status: "completed" }),
    ];
    expect(activeGoals(goals).map((g) => g.id)).toEqual(["a"]);
  });
});

describe("liquidSavingsCents", () => {
  it("is null, never 0, when there is no emergency reserve", () => {
    const goals = [goal({ id: "home", goalType: "home", currentAmountCents: 25_000_00 })];
    expect(liquidSavingsCents(goals)).toBeNull();
  });

  it("is null for an empty set", () => {
    expect(liquidSavingsCents([])).toBeNull();
  });

  it("sums every active reserve", () => {
    const goals = [
      goal({ id: "r1", goalType: "emergency_reserve", currentAmountCents: 4_000_00 }),
      goal({ id: "r2", goalType: "emergency_reserve", currentAmountCents: 1_500_00 }),
      goal({ id: "home", goalType: "home", currentAmountCents: 25_000_00 }),
    ];
    expect(liquidSavingsCents(goals)).toBe(5_500_00);
  });

  it("ignores an archived reserve", () => {
    const goals = [
      goal({ id: "r1", goalType: "emergency_reserve", currentAmountCents: 4_000_00 }),
      goal({
        id: "old",
        goalType: "emergency_reserve",
        currentAmountCents: 9_000_00,
        status: "archived",
      }),
    ];
    expect(liquidSavingsCents(goals)).toBe(4_000_00);
  });

  /** A funded-to-zero reserve is a real answer: they have nothing set aside. */
  it("returns 0 for a reserve that exists but is empty — that is known, not unknown", () => {
    expect(
      liquidSavingsCents([goal({ id: "r", goalType: "emergency_reserve", currentAmountCents: 0 })]),
    ).toBe(0);
  });
});

describe("downPaymentProgress", () => {
  it("is null when there is no home goal", () => {
    expect(downPaymentProgress([goal({ id: "r", goalType: "emergency_reserve" })])).toBeNull();
  });

  it("aggregates across home goals — two pots are one deposit", () => {
    const goals = [
      goal({
        id: "h1",
        goalType: "home",
        currentAmountCents: 10_000_00,
        targetAmountCents: 30_000_00,
      }),
      goal({
        id: "h2",
        goalType: "home",
        currentAmountCents: 5_000_00,
        targetAmountCents: 20_000_00,
      }),
    ];
    const p = downPaymentProgress(goals)!;
    expect(p.savedCents).toBe(15_000_00);
    expect(p.targetCents).toBe(50_000_00);
    expect(p.pct).toBe(30);
  });

  it("caps at 100 when over-funded rather than reporting 140%", () => {
    const goals = [
      goal({
        id: "h",
        goalType: "home",
        currentAmountCents: 14_000_00,
        targetAmountCents: 10_000_00,
      }),
    ];
    expect(downPaymentProgress(goals)!.pct).toBe(100);
  });

  it("reports 0% rather than NaN if a corrupt goal has a zero target", () => {
    const goals = [
      goal({ id: "h", goalType: "home", currentAmountCents: 500_00, targetAmountCents: 0 }),
    ];
    expect(downPaymentProgress(goals)!.pct).toBe(0);
  });
});

describe("primaryGoal", () => {
  it("prefers the emergency reserve, because it governs runway", () => {
    const goals = [
      goal({ id: "home", goalType: "home" }),
      goal({ id: "reserve", goalType: "emergency_reserve" }),
    ];
    expect(primaryGoal(goals)?.id).toBe("reserve");
  });

  it("falls back to the first active goal when there is no reserve", () => {
    const goals = [goal({ id: "travel", goalType: "travel" }), goal({ id: "car" })];
    expect(primaryGoal(goals)?.id).toBe("travel");
  });

  it("is null when nothing is active", () => {
    expect(primaryGoal([goal({ id: "a", status: "archived" })])).toBeNull();
  });
});

describe("goalsOfType", () => {
  it("filters by type and status together", () => {
    const goals = [
      goal({ id: "t1", goalType: "travel" }),
      goal({ id: "t2", goalType: "travel", status: "archived" }),
      goal({ id: "h", goalType: "home" }),
    ];
    expect(goalsOfType(goals, "travel").map((g) => g.id)).toEqual(["t1"]);
  });
});
