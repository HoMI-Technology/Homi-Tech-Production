/**
 * Goals surface derivation — per-goal projection, portfolio totals, split.
 *
 * Pure, so the arithmetic is testable without mounting anything. The rulings
 * about what a *set* of goals means (which count, what liquid savings is) live
 * in lib/finance/goal-semantics.ts; this is presentation shaping on top.
 */

import type { SavingsGoal } from "@/lib/finance/ledger";
import type { MoneyCents } from "@/lib/finance/money";
import { projectGoal, type GoalProjection } from "@/lib/finance/calculations";
import { activeGoals } from "@/lib/finance/goal-semantics";

export interface GoalRow {
  goal: SavingsGoal;
  projection: GoalProjection;
  /** 0–100, capped. */
  pct: number;
  /** True once current ≥ target. */
  funded: boolean;
  /**
   * True when the goal has a target date it will miss at the planned pace.
   * Null target date, or no pace, is not "behind" — it is unplanned, which is
   * a different thing and must not be coloured as failure.
   */
  behind: boolean;
}

export function goalRow(goal: SavingsGoal, fromDate: string): GoalRow {
  const projection = projectGoal(goal, fromDate);
  const pct =
    goal.targetAmountCents > 0
      ? Math.min(100, Math.round((goal.currentAmountCents / goal.targetAmountCents) * 1000) / 10)
      : 0;
  const funded = goal.currentAmountCents >= goal.targetAmountCents;

  const behind =
    !funded &&
    projection.requiredMonthlyCents !== null &&
    projection.requiredMonthlyCents > goal.plannedMonthlyContributionCents;

  return { goal, projection, pct, funded, behind };
}

export function goalRows(goals: readonly SavingsGoal[], fromDate: string): GoalRow[] {
  return activeGoals(goals).map((g) => goalRow(g, fromDate));
}

export interface GoalTotals {
  count: number;
  savedCents: MoneyCents;
  targetCents: MoneyCents;
  /** 0–100 across the whole set, capped. */
  pct: number;
  monthlyContributionCents: MoneyCents;
}

export function goalTotals(goals: readonly SavingsGoal[]): GoalTotals {
  const active = activeGoals(goals);
  const savedCents = active.reduce((s, g) => s + g.currentAmountCents, 0);
  const targetCents = active.reduce((s, g) => s + g.targetAmountCents, 0);
  const monthlyContributionCents = active.reduce(
    (s, g) => s + g.plannedMonthlyContributionCents,
    0,
  );
  return {
    count: active.length,
    savedCents,
    targetCents,
    pct: targetCents > 0 ? Math.min(100, Math.round((savedCents / targetCents) * 1000) / 10) : 0,
    monthlyContributionCents,
  };
}

export interface ContributionShare {
  goalId: string;
  name: string;
  cents: MoneyCents;
  /** Share of the monthly total, 0–100. */
  pct: number;
}

/**
 * How the monthly contribution total splits across goals. Returns an empty
 * list when nothing is being contributed — a split of zero is not a split, and
 * rendering equal slices of nothing would imply funding that is not happening.
 */
export function contributionSplit(goals: readonly SavingsGoal[]): ContributionShare[] {
  const active = activeGoals(goals).filter((g) => g.plannedMonthlyContributionCents > 0);
  const total = active.reduce((s, g) => s + g.plannedMonthlyContributionCents, 0);
  if (total <= 0) return [];

  return active.map((g) => ({
    goalId: g.id,
    name: g.name,
    cents: g.plannedMonthlyContributionCents,
    pct: Math.round((g.plannedMonthlyContributionCents / total) * 1000) / 10,
  }));
}
