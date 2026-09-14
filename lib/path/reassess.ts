/**
 * Path to Ready v1 — reassessment pass.
 *
 * Compares milestone targets against CURRENT recorded metrics and marks
 * progress. A milestone is marked done only when recorded data meets its
 * target — never by projection. `readyToReassess` fires when every
 * hard-stop milestone is done, prompting the user to re-take the
 * assessment. This module NEVER changes the verdict: only the scoring
 * engine can do that, on a fresh assessment.
 *
 * Pure; deterministic.
 */

import type { PathGoalInput, PathMetricsInput, PathMilestoneStatus } from "./types";

export interface ReassessMilestoneInput {
  id: string;
  kind: "hard_stop" | "savings" | "debt" | "credit" | "timing" | "evidence";
  status: PathMilestoneStatus;
  targetAmountCents: number | null;
  /** Hard-stop code for hard_stop milestones; goal id for goal savings. */
  reasonCode: string | null;
  fundingSourceMetric: string | null;
  fundingSourceGoalId?: string | null;
}

export interface ReassessPlanInput {
  milestones: ReassessMilestoneInput[];
}

export interface MilestoneProgress {
  id: string;
  /** New status — done only when recorded data meets the target. */
  status: PathMilestoneStatus;
  /** 0..100 toward the target from recorded data; null when not measurable. */
  progressPct: number | null;
}

export interface ReassessmentResult {
  updates: MilestoneProgress[];
  /** True when the plan has hard-stop milestones and all are done. */
  readyToReassess: boolean;
}

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function assessMilestone(
  m: ReassessMilestoneInput,
  metrics: PathMetricsInput | null,
  goals: PathGoalInput[],
): MilestoneProgress {
  // Manual terminal states are never overridden by data.
  if (m.status === "done" || m.status === "skipped") {
    return { id: m.id, status: m.status, progressPct: m.status === "done" ? 100 : null };
  }

  switch (m.kind) {
    case "hard_stop": {
      if (m.reasonCode === "DTI_OVER_50") {
        if (!metrics || metrics.dtiPct === null) {
          return { id: m.id, status: m.status, progressPct: null };
        }
        // Current below the recorded 50 line = done; otherwise progress is
        // the ratio of the line to the current recorded DTI.
        const done = metrics.dtiPct <= 50;
        return {
          id: m.id,
          status: done ? "done" : m.status,
          progressPct: done ? 100 : clampPct((50 / metrics.dtiPct) * 100),
        };
      }
      if (m.reasonCode === "RUNWAY_UNDER_1_MONTH") {
        if (!metrics || metrics.runwayMonths === null) {
          return { id: m.id, status: m.status, progressPct: null };
        }
        const done = metrics.runwayMonths >= 1;
        return {
          id: m.id,
          status: done ? "done" : m.status,
          progressPct: done ? 100 : clampPct(metrics.runwayMonths * 100),
        };
      }
      // HOUSING_RATIO_OVER_45 / CREDIT_UNDER_620 are not verifiable from
      // ledger metrics — completion is manual (PATCH), never assumed.
      return { id: m.id, status: m.status, progressPct: null };
    }
    case "savings": {
      const goal = m.fundingSourceGoalId
        ? goals.find((g) => g.id === m.fundingSourceGoalId)
        : undefined;
      if (goal && goal.targetAmountCents > 0) {
        const pct = clampPct((goal.currentAmountCents / goal.targetAmountCents) * 100);
        return { id: m.id, status: pct >= 100 ? "done" : m.status, progressPct: pct };
      }
      // Non-goal savings milestone (emergency reserve): runway is the measure.
      if (m.fundingSourceMetric === "runway" && metrics && metrics.runwayMonths !== null) {
        const done = metrics.runwayMonths >= 1;
        return {
          id: m.id,
          status: done ? "done" : m.status,
          progressPct: done ? 100 : clampPct(metrics.runwayMonths * 100),
        };
      }
      return { id: m.id, status: m.status, progressPct: null };
    }
    case "evidence": {
      if (!metrics) return { id: m.id, status: m.status, progressPct: null };
      const done = metrics.monthsWithData >= 3;
      return {
        id: m.id,
        status: done ? "done" : m.status,
        progressPct: done ? 100 : clampPct((metrics.monthsWithData / 3) * 100),
      };
    }
    default:
      // debt / credit / timing milestones complete manually.
      return { id: m.id, status: m.status, progressPct: null };
  }
}

/**
 * Runs the reassessment pass over a plan's milestones.
 * Returns per-milestone updates plus the readyToReassess flag.
 */
export function computeReassessment(
  plan: ReassessPlanInput,
  current: { metrics: PathMetricsInput | null; goals: PathGoalInput[] },
  _asOfDate: string,
): ReassessmentResult {
  const updates = plan.milestones.map((m) => assessMilestone(m, current.metrics, current.goals));
  const hardStops = plan.milestones.filter((m) => m.kind === "hard_stop");
  const doneIds = new Set(updates.filter((u) => u.status === "done").map((u) => u.id));
  const readyToReassess =
    hardStops.length > 0 && hardStops.every((m) => doneIds.has(m.id) || m.status === "done");
  return { updates, readyToReassess };
}
