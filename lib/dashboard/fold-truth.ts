/**
 * Pure fold-truth helpers for the signed-in Home.
 * Keep this module free of Next, scoring internals, and lab routes.
 */

import { foldHardStopDisplay } from "@/lib/assessment/hard-stop-copy";

export const ONBOARDING_SKIP_HREF = "/dashboard" as const;

export function isNextRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export function shouldSuppressBuildPercent(hardStopCount: number): boolean {
  return hardStopCount > 0;
}

/** 4-band dash-spectrum is a verdict-band claim. Hard stops hide it. */
export function shouldPaintDashSpectrum(hardStopCount: number): boolean {
  return !shouldSuppressBuildPercent(hardStopCount);
}

export function hardStopMessages(hardStops: unknown): string[] {
  if (!Array.isArray(hardStops)) return [];
  const messages: string[] = [];
  for (const row of hardStops) {
    if (!row || typeof row !== "object") continue;
    const message = (row as { message?: unknown }).message;
    if (typeof message !== "string") continue;
    const trimmed = message.trim();
    if (trimmed) messages.push(trimmed);
  }
  return messages;
}

export function buildProgressLabel(args: {
  done: number;
  total: number;
  hardStopCount: number;
}): string | null {
  if (shouldSuppressBuildPercent(args.hardStopCount)) return null;
  if (args.total <= 0) return null;
  return `${args.done} of ${args.total}`;
}

export function resumeDraftCopy(
  draft: { index: number; decisionType: string } | null,
): { href: "/assessment"; label: string; body: string } | null {
  if (!draft) return null;
  return {
    href: "/assessment",
    label: "Resume your assessment",
    body: "Your answers are still here. The build is where you left it — not a new start.",
  };
}

/**
 * Locked Home-fold Companion lines — SSOT for docs/COMPANION-PRESENCE.md.
 * One sentence only. Companion never calculates; Path owns the fold hero.
 */
export const COMPANION_FOLD_LINES = {
  hardStop: "A hard stop is the read right now. The path names what has to move first.",
  pathGuide: "Your next honest move is the binding step on Path to Ready.",
  assessmentOnly: "You have a read. Path to Ready is the map from here.",
  firstRun: "One measurement and this page has a build to show.",
} as const;

export type CompanionFoldLineKey = keyof typeof COMPANION_FOLD_LINES;

/**
 * Where Escalation (presence state 5) opens full conversation.
 * Stub only — do not mount chat UI on the Home fold; deep-link here later.
 */
export const COMPANION_ESCALATION_HREF = "/advisor" as const;

/** Presence states that drive the Home fold line (Silent Witness = no extra chrome). */
export type CompanionPresenceState =
  | "silent_witness"
  | "hard_stop_guardian"
  | "path_guide"
  | "score_rail"
  | "escalation";

export function companionPresenceState(args: {
  hasHardStops: boolean;
  hasPath: boolean;
  hasAssessment: boolean;
}): Exclude<CompanionPresenceState, "score_rail" | "escalation"> {
  if (args.hasHardStops) return "hard_stop_guardian";
  if (args.hasAssessment && args.hasPath) return "path_guide";
  // Assessment-only and first-run still speak the locked line; chat stays Silent Witness.
  if (args.hasAssessment) return "silent_witness";
  return "silent_witness";
}

export function companionFoldLine(args: {
  hasHardStops: boolean;
  hasPath: boolean;
  hasAssessment: boolean;
}): string {
  if (args.hasHardStops) {
    return COMPANION_FOLD_LINES.hardStop;
  }
  if (args.hasAssessment && args.hasPath) {
    return COMPANION_FOLD_LINES.pathGuide;
  }
  if (args.hasAssessment) {
    return COMPANION_FOLD_LINES.assessmentOnly;
  }
  return COMPANION_FOLD_LINES.firstRun;
}

/**
 * First-viewport instrument on signed-in HōMI. The fold is the repo
 * Threshold Compass. Score / runway / cash are last AssessmentResult only.
 * This module does not write the ledger or a score.
 */
export const HOME_FOLD_INSTRUMENT = "threshold" as const;

export type FoldPathPrimary = {
  href: string;
  title: string;
};

/**
 * Fold hard-stop codes. Same four Path already ranks.
 * Do not import the engine; this is display copy only.
 */
export const FOLD_HARD_STOP_CODES = [
  "RUNWAY_UNDER_1_MONTH",
  "DTI_OVER_50",
  "HOUSING_RATIO_OVER_45",
  "CREDIT_UNDER_620",
] as const;

export type FoldHardStopCode = (typeof FOLD_HARD_STOP_CODES)[number];

/**
 * Path + hard stops lead. Same precedence as Path HARD_STOP_ORDER.
 * Do not invent a new ranking.
 */
export const FOLD_HARD_STOP_PRECEDENCE: readonly FoldHardStopCode[] = [
  "RUNWAY_UNDER_1_MONTH",
  "DTI_OVER_50",
  "HOUSING_RATIO_OVER_45",
  "CREDIT_UNDER_620",
] as const;

/** Baseline 001 hard-stop kicker — sentence case, once. Not an ALL-CAPS wall. */
export const hardStopEyebrow = "Hard stop · runway." as const;

/** Baseline 001 hold line. Path owns the move; this names why. */
export const homeHoldSentence =
  "Runway is the hold. Build the fund before anything else." as const;

type FoldHardStopCopy = {
  eyebrow: string;
  hold: string;
  override: (scorePct: number) => string;
};

function foldHardStopCopy(
  code: FoldHardStopCode,
  decisionType: string = "home_buying",
): FoldHardStopCopy {
  return foldHardStopDisplay(code, decisionType);
}

export function isFoldHardStopCode(value: unknown): value is FoldHardStopCode {
  return (
    value === "RUNWAY_UNDER_1_MONTH" ||
    value === "DTI_OVER_50" ||
    value === "HOUSING_RATIO_OVER_45" ||
    value === "CREDIT_UNDER_620"
  );
}

/** Resolve a stored or Path code. Unknown / missing stays the Baseline 001 runway case. */
export function resolveFoldHardStopCode(
  code: FoldHardStopCode | null | undefined,
): FoldHardStopCode {
  return isFoldHardStopCode(code) ? code : "RUNWAY_UNDER_1_MONTH";
}

/** Codes from the same hard_stops rows that carry a human message. */
export function hardStopCodes(hardStops: unknown): FoldHardStopCode[] {
  if (!Array.isArray(hardStops)) return [];
  const codes: FoldHardStopCode[] = [];
  for (const row of hardStops) {
    if (!row || typeof row !== "object") continue;
    const message = (row as { message?: unknown }).message;
    if (typeof message !== "string" || !message.trim()) continue;
    const code = (row as { code?: unknown }).code;
    if (isFoldHardStopCode(code)) codes.push(code);
  }
  return codes;
}

/** First active stop in Path order. Null when no known code is present. */
export function leadingFoldHardStopCode(
  codes: readonly unknown[],
): FoldHardStopCode | null {
  const present = new Set<FoldHardStopCode>();
  for (const code of codes) {
    if (isFoldHardStopCode(code)) present.add(code);
  }
  if (present.size === 0) return null;
  for (const code of FOLD_HARD_STOP_PRECEDENCE) {
    if (present.has(code)) return code;
  }
  return null;
}

export function foldHardStopEyebrow(
  code?: FoldHardStopCode | null,
  decisionType: string = "home_buying",
): string {
  return foldHardStopCopy(resolveFoldHardStopCode(code), decisionType).eyebrow;
}

export function foldHomeHoldSentence(
  code?: FoldHardStopCode | null,
  decisionType: string = "home_buying",
): string {
  return foldHardStopCopy(resolveFoldHardStopCode(code), decisionType).hold;
}

/** Honest empty for last-read cash. Never a bare em dash next to a hard stop. */
export const CASH_EMPTY_LABEL = "Connect accounts to see cash." as const;

/**
 * Path SSOT for a runway hard stop. Never the 3–6 month grow-fund title on this fold.
 * DTI / housing / credit Path titles stay in lib/readiness/path.ts — do not rewrite them here.
 */
export const RUNWAY_HARD_STOP_PATH_TITLE =
  "Stabilize emergency runway to at least 1 month" as const;

const GROW_EMERGENCY_FUND_TITLE = "Grow emergency fund toward 3–6 months";

/** Quiet override line: score is real; a hard stop still holds. No 35/35/30, no cutoffs. */
export function foldHardStopOverrideLine(
  scorePct: number,
  code?: FoldHardStopCode | null,
  decisionType: string = "home_buying",
): string {
  return foldHardStopCopy(resolveFoldHardStopCode(code), decisionType).override(scorePct);
}

/**
 * Fold Path primary. A stored 3–6 month grow-fund title is the wrong close
 * only while RUNWAY_UNDER_1_MONTH is the resolved stop — swap to the SSOT
 * stabilize step. DTI / housing / credit keep the live Path title.
 */
export function resolveFoldPathPrimary(
  pathPrimary: FoldPathPrimary | null,
  stopCode?: FoldHardStopCode | null,
): FoldPathPrimary | null {
  if (!pathPrimary) return null;
  if (
    stopCode === "RUNWAY_UNDER_1_MONTH" &&
    pathPrimary.title === GROW_EMERGENCY_FUND_TITLE
  ) {
    return { ...pathPrimary, title: RUNWAY_HARD_STOP_PATH_TITLE };
  }
  return pathPrimary;
}

/** Next pending Path step for the fold — one primary, never REASSESS as the hero. */
export function foldPathPrimary(steps: unknown): FoldPathPrimary | null {
  if (!Array.isArray(steps)) return null;
  let firstPending: FoldPathPrimary | null = null;
  let runwayPending: FoldPathPrimary | null = null;
  for (const step of steps) {
    if (!step || typeof step !== "object") continue;
    const row = step as { title?: unknown; href?: unknown; status?: unknown; reasonCode?: unknown };
    if (row.reasonCode === "REASSESS") continue;
    const status = row.status ?? "pending";
    if (status !== "pending") continue;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const href = typeof row.href === "string" ? row.href.trim() : "";
    if (!title || !href) continue;
    const item: FoldPathPrimary = { title, href };
    if (!firstPending) firstPending = item;
    if (row.reasonCode === "RUNWAY_UNDER_1_MONTH") {
      runwayPending = { title: RUNWAY_HARD_STOP_PATH_TITLE, href };
    }
  }
  return runwayPending ?? firstPending;
}

/** Last AssessmentResult emergency-fund months. Under 1 month is named, never 0.5 mo. */
export function foldRunwayLabel(months: number | null | undefined): string {
  if (months == null || !Number.isFinite(months)) return "\u2014";
  if (months < 1) return "Under 1 month";
  const shown = months >= 10 ? months.toFixed(0) : months.toFixed(1);
  return `${shown} mo`;
}

/** Count actionable Path steps from a stored path payload (server or local). */
export function pathStepCounts(steps: unknown): { done: number; total: number } {
  if (!Array.isArray(steps)) return { done: 0, total: 0 };
  let done = 0;
  let total = 0;
  for (const step of steps) {
    if (!step || typeof step !== "object") continue;
    const reason = (step as { reasonCode?: unknown }).reasonCode;
    if (reason === "REASSESS") continue;
    total += 1;
    const status = (step as { status?: unknown }).status ?? "pending";
    if (status !== "pending") done += 1;
  }
  return { done, total };
}

export type HomeFoldPillar = "financial" | "emotional" | "timing";

function pillarDisplayName(key: HomeFoldPillar): string {
  switch (key) {
    case "financial":
      return "Financial Reality";
    case "emotional":
      return "Emotional Truth";
    case "timing":
      return "Perfect Timing";
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

/** Softest measured pillar. Null scores (skipped ET) are not treated as zero. */
export function weakestMeasuredPillar(scores: {
  financial: number | null;
  emotional: number | null;
  timing: number | null;
}): HomeFoldPillar | null {
  const measured: Array<{ key: HomeFoldPillar; value: number }> = [];
  const entries: Array<[HomeFoldPillar, number | null]> = [
    ["financial", scores.financial],
    ["emotional", scores.emotional],
    ["timing", scores.timing],
  ];
  for (const [key, value] of entries) {
    if (value !== null) measured.push({ key, value });
  }
  if (measured.length === 0) return null;
  measured.sort((a, b) => a.value - b.value);
  return measured[0].key;
}

/** One fold sentence: hard stop outranks the weak-pillar line. */
export function homeFoldSentence(args: {
  hardStopCount: number;
  weakestPillar: HomeFoldPillar | null;
  hasPath: boolean;
  hasAssessment: boolean;
}): string {
  if (args.hardStopCount > 0) {
    return companionFoldLine({
      hasHardStops: true,
      hasPath: args.hasPath,
      hasAssessment: args.hasAssessment,
    });
  }
  if (args.weakestPillar) {
    return `${pillarDisplayName(args.weakestPillar)} is the softest pillar on this read.`;
  }
  return companionFoldLine({
    hasHardStops: false,
    hasPath: args.hasPath,
    hasAssessment: args.hasAssessment,
  });
}
