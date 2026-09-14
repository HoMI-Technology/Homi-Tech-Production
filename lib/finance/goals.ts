/**
 * Budget & Runway — Phase 2 goals V2 (pure).
 *
 * Multi-goal progress math over the V2 shape: a goal may be funded by a
 * linked plaid account (linked_account_id) and/or by per-period cash
 * allocations (finance_goal_allocations). Pure: no I/O, no clock — the
 * as-of date is a parameter.
 *
 * Honesty rules:
 *   - A projection exists only when a real trailing allocation rate
 *     exists. No rate → null projection, never an invented date.
 *   - A linked account with an unknown balance is "unknown", not zero.
 *   - On-pace is an indicator with its assumptions spelled out, not a
 *     verdict.
 */

import { sumCents, type MoneyCents } from "@/lib/finance/money";
import type { SavingsGoal } from "@/lib/finance/ledger";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** One finance_goal_allocations row. */
export interface GoalAllocation {
  goalId: string;
  /** Date-only period start (YYYY-MM-DD); monthly periods in v2. */
  periodStart: string;
  amountCents: MoneyCents;
}

export type GoalFundingSource = "linked_account" | "allocations" | "manual_balance" | "unknown";

export interface GoalProgress {
  goalId: string;
  targetAmountCents: MoneyCents;
  /** Best available funded figure per fundingSource; null when unknown. */
  fundedCents: MoneyCents | null;
  fundingSource: GoalFundingSource;
  /** funded ÷ target, clamped to [0,1] for display; null when unfunded-unknown. */
  progressRatio: number | null;
  /** target − funded, floored at 0; null when funded is unknown. */
  remainingCents: MoneyCents | null;
  /** Trailing average monthly allocation in cents; null when fewer than
   * two distinct allocation periods exist (one month is not a rate). */
  trailingMonthlyRateCents: MoneyCents | null;
  /** Projected completion date from the trailing rate; null when there is
   * no rate or the goal is already funded. Never invented. */
  projectedCompletionDate: string | null;
  /** Whether the trailing pace reaches targetDate on time; null when the
   * goal has no target date, no rate, or no known balance. */
  onPace: boolean | null;
  /** The exact assumptions behind onPace/projection, for disclosure. */
  assumptions: string[];
}

/* ------------------------------------------------------------------ */
/* Date helpers (date-only, UTC-free)                                  */
/* ------------------------------------------------------------------ */

function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const total = (y! * 12 + (m! - 1)) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  // Clamp the day to the target month's length.
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const nd = Math.min(d!, lastDay);
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

function monthsBetween(fromDate: string, toDate: string): number {
  const [fy, fm] = fromDate.split("-").map(Number);
  const [ty, tm] = toDate.split("-").map(Number);
  return Math.max(0, (ty! - fy!) * 12 + (tm! - fm!));
}

/* ------------------------------------------------------------------ */
/* Trailing rate                                                       */
/* ------------------------------------------------------------------ */

/**
 * Average monthly allocation across the distinct periods present, using
 * the span between the first and last period start (inclusive month
 * count) as the denominator. Requires ≥2 distinct periods — a single
 * allocation is an event, not a rate.
 */
export function trailingMonthlyRate(allocations: readonly GoalAllocation[]): MoneyCents | null {
  const byPeriod = new Map<string, number>();
  for (const a of allocations) {
    byPeriod.set(a.periodStart, (byPeriod.get(a.periodStart) ?? 0) + a.amountCents);
  }
  const starts = [...byPeriod.keys()].sort();
  if (starts.length < 2) return null;
  const spanMonths = monthsBetween(starts[0]!, starts[starts.length - 1]!) + 1;
  const total = sumCents([...byPeriod.values()]);
  return Math.round(total / spanMonths);
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

/**
 * Progress for one goal.
 *
 * Funding source precedence:
 *   1. linked account balance when the goal has linkedAccountId — the
 *      account is the balance of record (null balance → unknown, not 0)
 *   2. sum of recorded allocations when any exist
 *   3. the manual currentAmountCents otherwise
 */
export function computeGoalProgress(
  goal: Pick<
    SavingsGoal,
    "id" | "targetAmountCents" | "currentAmountCents" | "targetDate" | "linkedAccountId"
  >,
  allocations: readonly GoalAllocation[],
  linkedBalanceCents: MoneyCents | null,
  asOfDate: string,
): GoalProgress {
  const goalAllocations = allocations.filter((a) => a.goalId === goal.id);

  let fundedCents: MoneyCents | null;
  let fundingSource: GoalFundingSource;
  if (goal.linkedAccountId !== null) {
    fundingSource = linkedBalanceCents !== null ? "linked_account" : "unknown";
    fundedCents = linkedBalanceCents;
  } else if (goalAllocations.length > 0) {
    fundingSource = "allocations";
    fundedCents = sumCents(goalAllocations.map((a) => a.amountCents));
  } else {
    fundingSource = "manual_balance";
    fundedCents = goal.currentAmountCents;
  }

  const remainingCents =
    fundedCents !== null ? Math.max(0, goal.targetAmountCents - fundedCents) : null;
  const progressRatio =
    fundedCents !== null && goal.targetAmountCents > 0
      ? Math.min(1, fundedCents / goal.targetAmountCents)
      : null;

  const rateCents = trailingMonthlyRate(goalAllocations);

  const assumptions: string[] = [];
  let projectedCompletionDate: string | null = null;
  if (remainingCents !== null && remainingCents > 0 && rateCents !== null && rateCents > 0) {
    const monthsNeeded = Math.ceil(remainingCents / rateCents);
    projectedCompletionDate = addMonths(asOfDate, monthsNeeded);
    assumptions.push(
      `Projection assumes the trailing average monthly allocation (${rateCents} cents/month over recorded periods) continues unchanged.`,
    );
  }

  let onPace: boolean | null = null;
  if (goal.targetDate !== null && remainingCents !== null && remainingCents > 0) {
    const monthsLeft = monthsBetween(asOfDate, goal.targetDate);
    if (monthsLeft > 0 && rateCents !== null) {
      const requiredCents = Math.ceil(remainingCents / monthsLeft);
      onPace = rateCents >= requiredCents;
      assumptions.push(
        `On-pace compares the trailing rate to ${requiredCents} cents/month required to reach the target date (${goal.targetDate}).`,
      );
    }
  } else if (remainingCents === 0) {
    onPace = true; // already funded
  }

  return {
    goalId: goal.id,
    targetAmountCents: goal.targetAmountCents,
    fundedCents,
    fundingSource,
    progressRatio,
    remainingCents,
    trailingMonthlyRateCents: rateCents,
    projectedCompletionDate,
    onPace,
    assumptions,
  };
}

/* ------------------------------------------------------------------ */
/* Multi-goal summary                                                  */
/* ------------------------------------------------------------------ */

export interface GoalsSummary {
  goals: GoalProgress[];
  /** Sum of per-goal trailing monthly rates (goals without a rate
   * contribute 0 — a missing rate is not an invented 0-rate goal, it is
   * simply not part of the monthly total). */
  totalMonthlyAllocationCents: MoneyCents;
  activeGoalCount: number;
  goalsWithProjection: number;
}

export function summarizeGoals(
  goals: readonly Pick<
    SavingsGoal,
    "id" | "targetAmountCents" | "currentAmountCents" | "targetDate" | "linkedAccountId" | "status"
  >[],
  allocations: readonly GoalAllocation[],
  linkedBalances: ReadonlyMap<string, MoneyCents | null>,
  asOfDate: string,
): GoalsSummary {
  const active = goals.filter((g) => g.status === "active");
  const progress = active.map((goal) =>
    computeGoalProgress(
      goal,
      allocations,
      goal.linkedAccountId !== null
        ? (linkedBalances.get(goal.linkedAccountId) ?? null)
        : null,
      asOfDate,
    ),
  );

  return {
    goals: progress,
    totalMonthlyAllocationCents: sumCents(
      progress.map((p) => p.trailingMonthlyRateCents ?? 0),
    ),
    activeGoalCount: active.length,
    goalsWithProjection: progress.filter((p) => p.projectedCompletionDate !== null).length,
  };
}
