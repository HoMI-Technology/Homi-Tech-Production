/**
 * Home Key Areas — ≤4 SSOT tiles from live AssessmentRow + hard stops.
 * Never invent pillars. Never label On track / READY while a hard stop is active.
 */

import { PILLARS } from "@/lib/brand";
import type { FoldHardStopCode } from "@/lib/dashboard/fold-truth";

export const KEY_AREA_STATUS = {
  needsWork: "Needs work",
  strong: "Strong",
} as const;

export type KeyAreaStatus = (typeof KEY_AREA_STATUS)[keyof typeof KEY_AREA_STATUS];

export type KeyAreaId = "runway" | "financial" | "emotional" | "timing";

export type KeyArea = {
  id: KeyAreaId;
  title: string;
  status: KeyAreaStatus;
  note: string;
};

const PILLAR_MAX: Record<"financial" | "emotional" | "timing", number> = {
  financial: PILLARS[0].max,
  emotional: PILLARS[1].max,
  timing: PILLARS[2].max,
};

/** ALMOST_THERE floor — Strong is not On track, and never a READY claim. */
export const KEY_AREA_STRONG_FLOOR = 65 as const;

export function pillarPct(score: number | null | undefined, max: number): number | null {
  if (score == null || !Number.isFinite(score) || !Number.isFinite(max) || max <= 0) {
    return null;
  }
  return Math.round((score / max) * 100);
}

/**
 * Binary Home tone. Hard-stop active forbids On track / READY — Strong is the
 * honest high band when the pillar itself is not the hold.
 */
export function keyAreaStatus(
  pct: number | null,
  hardStopActive: boolean,
): KeyAreaStatus {
  void hardStopActive;
  if (pct == null || pct < KEY_AREA_STRONG_FLOOR) return KEY_AREA_STATUS.needsWork;
  return KEY_AREA_STATUS.strong;
}

function runwayArea(args: {
  stopCode: FoldHardStopCode | null;
  runwayMonths: number | null | undefined;
  hardStopActive: boolean;
}): KeyArea {
  const underOne =
    args.stopCode === "RUNWAY_UNDER_1_MONTH" ||
    (args.runwayMonths != null && Number.isFinite(args.runwayMonths) && args.runwayMonths < 1);
  const status: KeyAreaStatus = underOne
    ? KEY_AREA_STATUS.needsWork
    : keyAreaStatus(args.runwayMonths == null ? null : args.runwayMonths >= 1 ? 80 : 40, args.hardStopActive);
  const note = underOne
    ? "Hard stop active — under 1 month."
    : args.hardStopActive
      ? "Hold stays binding while a stop is active."
      : "Runway from your latest reading.";
  return { id: "runway", title: "Runway", status, note };
}

function pillarArea(args: {
  id: "financial" | "emotional" | "timing";
  title: string;
  score: number | null | undefined;
  hardStopActive: boolean;
  stopCode: FoldHardStopCode | null;
}): KeyArea | null {
  const pct = pillarPct(args.score, PILLAR_MAX[args.id]);
  if (pct == null) return null;
  const status = keyAreaStatus(pct, args.hardStopActive);
  let note = "Pillar from your latest reading.";
  if (args.hardStopActive && args.stopCode === "RUNWAY_UNDER_1_MONTH") {
    if (args.id === "financial") {
      note = "Pillar from your latest reading — hold stays binding while stop is active.";
    } else if (args.id === "timing") {
      note = "Timing pillar from AssessmentResult — readiness still held by runway.";
    } else {
      note = "Pillar from AssessmentResult — readiness still held by runway.";
    }
  }
  return { id: args.id, title: args.title, status, note };
}

export function keyAreasFromReading(args: {
  financialScore: number | null | undefined;
  emotionalScore: number | null | undefined;
  timingScore: number | null | undefined;
  runwayMonths: number | null | undefined;
  stopCode: FoldHardStopCode | null;
  hardStopActive: boolean;
}): KeyArea[] {
  const areas: KeyArea[] = [
    runwayArea({
      stopCode: args.stopCode,
      runwayMonths: args.runwayMonths,
      hardStopActive: args.hardStopActive,
    }),
  ];
  const financial = pillarArea({
    id: "financial",
    title: "Financial Reality",
    score: args.financialScore,
    hardStopActive: args.hardStopActive,
    stopCode: args.stopCode,
  });
  const emotional = pillarArea({
    id: "emotional",
    title: "Emotional Truth",
    score: args.emotionalScore,
    hardStopActive: args.hardStopActive,
    stopCode: args.stopCode,
  });
  const timing = pillarArea({
    id: "timing",
    title: "Perfect Timing",
    score: args.timingScore,
    hardStopActive: args.hardStopActive,
    stopCode: args.stopCode,
  });
  for (const area of [financial, emotional, timing]) {
    if (area) areas.push(area);
  }
  return areas.slice(0, 4);
}
