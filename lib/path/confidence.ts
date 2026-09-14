/**
 * Confidence caps + provenance for Path to Ready milestones.
 *
 * Honesty rule (research: "data provenance + confidence caps"): a milestone
 * target can never be presented with more confidence than the data it was
 * derived from. Low-completeness data caps everything built on it.
 *
 * Pure; no I/O.
 */

import type { MilestoneProvenance, PathCompleteness } from "./types";

/** Numeric confidence ceiling per completeness grade. Deliberately conservative. */
export const CONFIDENCE_CAPS: Record<PathCompleteness, number> = {
  low: 0.35,
  medium: 0.65,
  high: 0.9,
};

/** Cap for milestones not backed by a graded metric (self-report / unknown). */
export const UNGRADED_CONFIDENCE_CAP = CONFIDENCE_CAPS.low;

export function confidenceCapFor(completeness: PathCompleteness | null): number {
  return completeness === null ? UNGRADED_CONFIDENCE_CAP : CONFIDENCE_CAPS[completeness];
}

/** Provenance for a target derived from a named, graded metric. */
export function metricProvenance(input: {
  metric: string;
  valueCents: number | null;
  completeness: PathCompleteness;
}): MilestoneProvenance {
  return {
    basis: "metric",
    metric: input.metric,
    valueCents: input.valueCents,
    completeness: input.completeness,
    confidenceCap: confidenceCapFor(input.completeness),
  };
}

/** Provenance for a target bridged from a finance savings goal. */
export function goalProvenance(input: {
  valueCents: number | null;
  completeness: PathCompleteness | null;
}): MilestoneProvenance {
  return {
    basis: "goal",
    metric: "savings_goal",
    valueCents: input.valueCents,
    completeness: input.completeness,
    confidenceCap: confidenceCapFor(input.completeness),
  };
}

/** Provenance for a milestone grounded in the recorded assessment itself. */
export function assessmentProvenance(): MilestoneProvenance {
  return {
    basis: "assessment",
    metric: null,
    valueCents: null,
    completeness: null,
    confidenceCap: UNGRADED_CONFIDENCE_CAP,
  };
}

/**
 * Provenance for a milestone whose amount was withheld because the inputs
 * are missing. The milestone still exists — the amount does not. Inventing
 * a number here is the one thing the Path must never do.
 */
export function insufficientDataProvenance(metric: string): MilestoneProvenance {
  return {
    basis: "insufficient_data",
    metric,
    valueCents: null,
    completeness: null,
    confidenceCap: UNGRADED_CONFIDENCE_CAP,
  };
}
