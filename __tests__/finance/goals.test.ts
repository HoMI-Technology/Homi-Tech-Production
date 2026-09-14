import { describe, expect, it } from "vitest";
import {
  computeGoalProgress,
  summarizeGoals,
  trailingMonthlyRate,
  type GoalAllocation,
} from "@/lib/finance/goals";

const goal = (overrides: Record<string, unknown> = {}) => ({
  id: "g1",
  targetAmountCents: 1000000,
  currentAmountCents: 100000,
  targetDate: null as string | null,
  linkedAccountId: null as string | null,
  status: "active" as const,
  ...overrides,
});

const alloc = (periodStart: string, amountCents: number, goalId = "g1"): GoalAllocation => ({
  goalId,
  periodStart,
  amountCents,
});

describe("trailingMonthlyRate", () => {
  it("is null with fewer than two distinct periods", () => {
    expect(trailingMonthlyRate([])).toBeNull();
    expect(trailingMonthlyRate([alloc("2026-01-01", 5000)])).toBeNull();
  });

  it("averages across the inclusive month span", () => {
    // Jan + Mar, no Feb: span = 3 months, total 18000 → 6000/mo.
    expect(trailingMonthlyRate([alloc("2026-01-01", 10000), alloc("2026-03-01", 8000)])).toBe(6000);
    // Two allocations in the same period count as one period.
    expect(
      trailingMonthlyRate([alloc("2026-01-01", 4000), alloc("2026-01-01", 2000), alloc("2026-02-01", 6000)]),
    ).toBe(6000);
  });
});

describe("computeGoalProgress", () => {
  it("uses linked account balance when linked; null balance is unknown, not zero", () => {
    const linked = goal({ linkedAccountId: "acc-1" });
    const known = computeGoalProgress(linked, [], 250000, "2026-09-14");
    expect(known.fundingSource).toBe("linked_account");
    expect(known.fundedCents).toBe(250000);
    expect(known.progressRatio).toBeCloseTo(0.25);

    const unknown = computeGoalProgress(linked, [], null, "2026-09-14");
    expect(unknown.fundingSource).toBe("unknown");
    expect(unknown.fundedCents).toBeNull();
    expect(unknown.progressRatio).toBeNull();
    expect(unknown.remainingCents).toBeNull();
  });

  it("sums allocations when not linked, else falls back to manual balance", () => {
    const withAlloc = computeGoalProgress(
      goal(),
      [alloc("2026-07-01", 30000), alloc("2026-08-01", 30000)],
      null,
      "2026-09-14",
    );
    expect(withAlloc.fundingSource).toBe("allocations");
    expect(withAlloc.fundedCents).toBe(60000);

    const manual = computeGoalProgress(goal(), [], null, "2026-09-14");
    expect(manual.fundingSource).toBe("manual_balance");
    expect(manual.fundedCents).toBe(100000);
  });

  it("projects completion from the trailing rate; null when no rate", () => {
    // Funded 200k of 1M via allocations; rate 100k/mo → 8 more months.
    const p = computeGoalProgress(
      goal(),
      [alloc("2026-07-01", 100000), alloc("2026-08-01", 100000)],
      null,
      "2026-09-14",
    );
    expect(p.trailingMonthlyRateCents).toBe(100000);
    expect(p.remainingCents).toBe(800000);
    expect(p.projectedCompletionDate).toBe("2027-05-14");
    expect(p.assumptions.length).toBeGreaterThan(0);

    const noRate = computeGoalProgress(goal(), [], null, "2026-09-14");
    expect(noRate.trailingMonthlyRateCents).toBeNull();
    expect(noRate.projectedCompletionDate).toBeNull();
  });

  it("never projects an already-funded goal; onPace is true", () => {
    const p = computeGoalProgress(
      goal({ currentAmountCents: 1000000 }),
      [],
      null,
      "2026-09-14",
    );
    expect(p.remainingCents).toBe(0);
    expect(p.projectedCompletionDate).toBeNull();
    expect(p.onPace).toBe(true);
  });

  it("onPace compares trailing rate to required rate with assumptions", () => {
    // Target 1M, funded 400k, target in 6 months → required 100k/mo.
    const onPace = computeGoalProgress(
      goal({ targetDate: "2027-03-14" }),
      [alloc("2026-06-01", 200000), alloc("2026-08-01", 200000)],
      null,
      "2026-09-14",
    );
    // trailing: 400k over 3 months (Jun,Jul,Aug span) = 133333/mo ≥ 100k required
    expect(onPace.onPace).toBe(true);

    const behind = computeGoalProgress(
      goal({ targetDate: "2027-03-14" }),
      [alloc("2026-07-01", 50000), alloc("2026-08-01", 50000)], // 50k/mo < 100k required
      null,
      "2026-09-14",
    );
    expect(behind.onPace).toBe(false);
    expect(behind.assumptions.some((a) => a.includes("required"))).toBe(true);
  });

  it("onPace is null without a target date", () => {
    const p = computeGoalProgress(
      goal(),
      [alloc("2026-07-01", 1000), alloc("2026-08-01", 1000)],
      null,
      "2026-09-14",
    );
    expect(p.onPace).toBeNull();
  });

  it("clamps progress ratio at 1 when overfunded", () => {
    const p = computeGoalProgress(goal({ currentAmountCents: 1500000 }), [], null, "2026-09-14");
    expect(p.progressRatio).toBe(1);
    expect(p.remainingCents).toBe(0);
  });
});

describe("summarizeGoals", () => {
  it("sums trailing rates across active goals only", () => {
    const summary = summarizeGoals(
      [
        goal({ id: "g1" }),
        goal({ id: "g2" }),
        goal({ id: "g3", status: "archived" }),
      ],
      [
        alloc("2026-07-01", 10000, "g1"),
        alloc("2026-08-01", 10000, "g1"),
        alloc("2026-07-01", 5000, "g2"),
        alloc("2026-08-01", 5000, "g2"),
        alloc("2026-07-01", 999999, "g3"), // archived — excluded
      ],
      new Map(),
      "2026-09-14",
    );
    expect(summary.activeGoalCount).toBe(2);
    expect(summary.totalMonthlyAllocationCents).toBe(15000);
    expect(summary.goalsWithProjection).toBe(2);
  });

  it("passes linked balances through by account id", () => {
    const summary = summarizeGoals(
      [goal({ id: "g1", linkedAccountId: "acc-9" })],
      [],
      new Map([["acc-9", 123456]]),
      "2026-09-14",
    );
    expect(summary.goals[0]!.fundedCents).toBe(123456);
    expect(summary.goals[0]!.fundingSource).toBe("linked_account");
  });

  it("handles the empty goal set", () => {
    const summary = summarizeGoals([], [], new Map(), "2026-09-14");
    expect(summary.activeGoalCount).toBe(0);
    expect(summary.totalMonthlyAllocationCents).toBe(0);
    expect(summary.goals).toEqual([]);
  });
});
