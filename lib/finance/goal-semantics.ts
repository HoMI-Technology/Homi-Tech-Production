/**
 * What a set of goals means for the money picture.
 *
 * With one goal per user these questions had obvious answers, so the logic sat
 * inline in four different modules — and drifted: lib/advisor/finance-context.ts
 * returned null for unknown liquid savings while lib/finance/readiness-snapshot.ts
 * returned 0 for the same condition. Same question, two answers, one of them a
 * false statement about someone's money.
 *
 * Multiple goals make the questions genuinely ambiguous, so the rulings live
 * here and every consumer asks rather than deciding for itself.
 *
 * The rulings:
 *
 *   Liquid savings — the sum of every active emergency-reserve goal. Null, never
 *   zero, when the user has none: the ledger cannot see cash it was never told
 *   about, and zero is a claim we cannot support. (A user with a house fund and
 *   no reserve has unknown liquid savings, not none.)
 *
 *   Down-payment progress — aggregated across every active home goal:
 *   sum(current) / sum(target). Someone saving into two home pots is one
 *   person saving for one house; showing progress against only the first would
 *   understate them. Null when there is no home goal.
 *
 * Both ignore non-active goals: a paused or archived goal is history, not part
 * of the current picture.
 */

import type { MoneyCents } from "@/lib/finance/money";
import type { SavingsGoal } from "@/lib/finance/ledger";

/** Goals that count toward the present picture. */
export function activeGoals(goals: readonly SavingsGoal[]): SavingsGoal[] {
  return goals.filter((g) => g.status === "active");
}

export function goalsOfType(
  goals: readonly SavingsGoal[],
  goalType: SavingsGoal["goalType"],
): SavingsGoal[] {
  return activeGoals(goals).filter((g) => g.goalType === goalType);
}

/**
 * Cash the ledger can actually see, in cents. Null means unknown — the caller
 * must render "unknown" rather than a figure, and must not coerce to 0.
 */
export function liquidSavingsCents(goals: readonly SavingsGoal[]): MoneyCents | null {
  const reserves = goalsOfType(goals, "emergency_reserve");
  if (reserves.length === 0) return null;
  return reserves.reduce((sum, g) => sum + g.currentAmountCents, 0);
}

export interface DownPaymentProgress {
  savedCents: MoneyCents;
  targetCents: MoneyCents;
  /** 0–100, capped. */
  pct: number;
}

/** Aggregate progress across every active home goal. Null when there are none. */
export function downPaymentProgress(goals: readonly SavingsGoal[]): DownPaymentProgress | null {
  const homes = goalsOfType(goals, "home");
  if (homes.length === 0) return null;

  const savedCents = homes.reduce((sum, g) => sum + g.currentAmountCents, 0);
  const targetCents = homes.reduce((sum, g) => sum + g.targetAmountCents, 0);
  // A zero total target would be a corrupt goal; report 0% rather than NaN.
  const pct =
    targetCents > 0 ? Math.min(100, Math.round((savedCents / targetCents) * 1000) / 10) : 0;

  return { savedCents, targetCents, pct };
}

/**
 * The goal a single-goal surface should show, until those surfaces learn to
 * show several. Prefers the emergency reserve — it is the one that governs
 * runway — then falls back to the first active goal.
 */
export function primaryGoal(goals: readonly SavingsGoal[]): SavingsGoal | null {
  const active = activeGoals(goals);
  if (active.length === 0) return null;
  return active.find((g) => g.goalType === "emergency_reserve") ?? active[0];
}
