/**
 * Home Key Factors LOOK — ≤6 tiles from live AssessmentResult + hard_stops.
 * Mock-like labels. Statuses only Needs work / Strong / Not assessed.
 * Never invent Strong. Never label On track / READY while a hard stop is active.
 */

import { PILLARS } from "@/lib/brand";
import type { FoldHardStopCode } from "@/lib/dashboard/fold-truth";

export const KEY_AREA_STATUS = {
  needsWork: "Needs work",
  strong: "Strong",
  notAssessed: "Not assessed",
} as const;

export type KeyAreaStatus = (typeof KEY_AREA_STATUS)[keyof typeof KEY_AREA_STATUS];

export type KeyAreaId =
  | "runway"
  | "income"
  | "debt"
  | "housing"
  | "emotional"
  | "timing";

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

export const KEY_FACTORS_MAX = 6 as const;

export function pillarPct(score: number | null | undefined, max: number): number | null {
  if (score == null || !Number.isFinite(score) || !Number.isFinite(max) || max <= 0) {
    return null;
  }
  return Math.round((score / max) * 100);
}

/**
 * Binary Home tone. Hard-stop active forbids On track / READY — Strong is the
 * honest high band when the pillar itself was scored. Null score stays Not assessed.
 */
export function keyAreaStatus(
  pct: number | null,
  hardStopActive: boolean,
): KeyAreaStatus {
  void hardStopActive;
  if (pct == null) return KEY_AREA_STATUS.notAssessed;
  if (pct < KEY_AREA_STRONG_FLOOR) return KEY_AREA_STATUS.needsWork;
  return KEY_AREA_STATUS.strong;
}

function hasStop(codes: readonly FoldHardStopCode[], code: FoldHardStopCode): boolean {
  return codes.includes(code);
}

function runwayArea(args: {
  codes: readonly FoldHardStopCode[];
  runwayMonths: number | null | undefined;
}): KeyArea {
  const underOne =
    hasStop(args.codes, "RUNWAY_UNDER_1_MONTH") ||
    (args.runwayMonths != null && Number.isFinite(args.runwayMonths) && args.runwayMonths < 1);
  const status: KeyAreaStatus = underOne
    ? KEY_AREA_STATUS.needsWork
    : args.runwayMonths == null
      ? KEY_AREA_STATUS.notAssessed
      : keyAreaStatus(args.runwayMonths >= 1 ? 80 : 40, false);
  const note = underOne
    ? "Hard stop active — under 1 month."
    : status === KEY_AREA_STATUS.notAssessed
      ? "Not scored on this reading."
      : "Runway from your latest reading.";
  return { id: "runway", title: "Emergency Runway", status, note };
}

function pillarFactor(args: {
  id: "income" | "emotional" | "timing";
  title: string;
  pillar: "financial" | "emotional" | "timing";
  score: number | null | undefined;
  hardStopActive: boolean;
  scoredNote: string;
}): KeyArea {
  const pct = pillarPct(args.score, PILLAR_MAX[args.pillar]);
  const status = keyAreaStatus(pct, args.hardStopActive);
  const note =
    status === KEY_AREA_STATUS.notAssessed ? "Not scored on this reading." : args.scoredNote;
  return { id: args.id, title: args.title, status, note };
}

function stopOrEmptyFactor(args: {
  id: "debt" | "housing";
  title: string;
  stop: FoldHardStopCode;
  codes: readonly FoldHardStopCode[];
  activeNote: string;
  emptyNote: string;
}): KeyArea {
  const active = hasStop(args.codes, args.stop);
  return {
    id: args.id,
    title: args.title,
    status: active ? KEY_AREA_STATUS.needsWork : KEY_AREA_STATUS.notAssessed,
    note: active ? args.activeNote : args.emptyNote,
  };
}

export function keyAreasFromReading(args: {
  financialScore: number | null | undefined;
  emotionalScore: number | null | undefined;
  timingScore: number | null | undefined;
  runwayMonths: number | null | undefined;
  stopCode: FoldHardStopCode | null;
  stopCodes?: readonly FoldHardStopCode[];
  hardStopActive: boolean;
}): KeyArea[] {
  const codes: FoldHardStopCode[] = args.stopCodes
    ? [...args.stopCodes]
    : args.stopCode
      ? [args.stopCode]
      : [];
  const areas: KeyArea[] = [
    runwayArea({
      codes,
      runwayMonths: args.runwayMonths,
    }),
    pillarFactor({
      id: "income",
      title: "Income Stability",
      pillar: "financial",
      score: args.financialScore,
      hardStopActive: args.hardStopActive,
      scoredNote: "From financial pillar (live SSOT).",
    }),
    stopOrEmptyFactor({
      id: "debt",
      title: "Debt Management",
      stop: "DTI_OVER_50",
      codes,
      activeNote: "Hard stop active — DTI.",
      emptyNote: "No DTI stop · no invent.",
    }),
    stopOrEmptyFactor({
      id: "housing",
      title: "Housing Affordability",
      stop: "HOUSING_RATIO_OVER_45",
      codes,
      activeNote: "Hard stop active — housing ratio.",
      emptyNote: "No housing-ratio stop.",
    }),
    pillarFactor({
      id: "emotional",
      title: "Emotional Readiness",
      pillar: "emotional",
      score: args.emotionalScore,
      hardStopActive: args.hardStopActive,
      scoredNote: "From emotional_score live.",
    }),
    pillarFactor({
      id: "timing",
      title: "Perfect Timing",
      pillar: "timing",
      score: args.timingScore,
      hardStopActive: args.hardStopActive,
      scoredNote: "From timing_score live.",
    }),
  ];
  return areas.slice(0, KEY_FACTORS_MAX);
}
