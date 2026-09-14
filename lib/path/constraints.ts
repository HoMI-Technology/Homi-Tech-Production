/**
 * Binding-constraint resolution for Path to Ready v1.
 *
 * Resolution order and hard-stop titles mirror lib/readiness/path.ts
 * (client canon). lib/path is the server SSOT for Path to Ready;
 * lib/readiness/path.ts UI adoption of /api/path is a follow-up — until
 * then both use the same order/titles so they cannot disagree.
 *
 * Ordered hard-stop resolution ("fix solvency first"):
 *
 *   RUNWAY_UNDER_1_MONTH → DTI_OVER_50 → HOUSING_RATIO_OVER_45 → CREDIT_UNDER_620
 *
 * When no hard stop fired, the binding constraint is the weakest recorded
 * pillar (financial → emotional → timing on ties).
 *
 * This module CONSUMES recorded hard-stops and pillar snapshots. It never
 * re-detects a hard stop and never recomputes a pillar or verdict.
 *
 * Pure; deterministic.
 */

import type {
  BindingConstraint,
  PathPillarKey,
  PathPillarSnapshot,
  PathHardStopCode,
  RecordedHardStop,
} from "./types";

/**
 * Resolution order — the sequence later milestones queue behind.
 * Matches HARD_STOP_ORDER in lib/readiness/path.ts exactly.
 */
export const HARD_STOP_RESOLUTION_ORDER: readonly PathHardStopCode[] = [
  "RUNWAY_UNDER_1_MONTH",
  "DTI_OVER_50",
  "HOUSING_RATIO_OVER_45",
  "CREDIT_UNDER_620",
] as const;

const HARD_STOP_LABELS: Record<PathHardStopCode, string> = {
  RUNWAY_UNDER_1_MONTH: "Emergency runway under one month",
  DTI_OVER_50: "Debt-to-income above the protective line",
  HOUSING_RATIO_OVER_45: "Housing cost above 45% of income",
  CREDIT_UNDER_620: "Credit below the 620 protective floor",
};

const PILLAR_LABELS: Record<PathPillarKey, string> = {
  financial: "Financial Reality",
  emotional: "Emotional Truth",
  timing: "Perfect Timing",
};

/** Neutral, protective rationale. No urgency, no advice, no "you should". */
function rationaleFor(label: string): string {
  return (
    `${label} is the constraint to resolve first. ` +
    "The milestones below are ordered so this gate clears before later steps build on it. " +
    "This is an educational map, not a verdict."
  );
}

/** Recorded hard-stops in resolution order (consumes, never re-detects). */
export function orderedHardStops(hardStops: RecordedHardStop[]): RecordedHardStop[] {
  const byCode = new Map(hardStops.map((h) => [h.code, h]));
  return HARD_STOP_RESOLUTION_ORDER.map((code) => byCode.get(code)).filter(
    (h): h is RecordedHardStop => h !== undefined,
  );
}

/** Weakest pillar by recorded percentage of max; ties break financial → emotional → timing. */
export function weakestPillar(pillars: PathPillarSnapshot): PathPillarKey {
  const keys: PathPillarKey[] = ["financial", "emotional", "timing"];
  let weakest: PathPillarKey = keys[0];
  let weakestPct = Number.POSITIVE_INFINITY;
  for (const key of keys) {
    const entry = pillars[key];
    const pct = entry.max > 0 ? entry.total / entry.max : 0;
    if (pct < weakestPct) {
      weakestPct = pct;
      weakest = key;
    }
  }
  return weakest;
}

/**
 * Resolves the single binding constraint the path is ordered around.
 * Hard-stops outrank pillars; the first in resolution order wins.
 */
export function resolveBindingConstraint(
  hardStops: RecordedHardStop[],
  pillars: PathPillarSnapshot,
): BindingConstraint {
  const ordered = orderedHardStops(hardStops);
  if (ordered.length > 0) {
    const first = ordered[0];
    const label = HARD_STOP_LABELS[first.code];
    return {
      code: first.code,
      label,
      rationale: rationaleFor(label),
      evidenceRefs: [`hard_stop:${first.code}`],
    };
  }
  const key = weakestPillar(pillars);
  const label = `${PILLAR_LABELS[key]} is the lowest readiness dimension`;
  return {
    code: `pillar:${key}`,
    label,
    rationale: rationaleFor(label),
    evidenceRefs: [`pillar:${key}`],
  };
}
