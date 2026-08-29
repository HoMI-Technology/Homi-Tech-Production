/**
 * Pure fold-truth helpers for the signed-in Home.
 * Keep this module free of Next, scoring internals, and lab routes.
 */

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

/** Next pending Path step for the fold — one primary, never REASSESS as the hero. */
export function foldPathPrimary(steps: unknown): FoldPathPrimary | null {
  if (!Array.isArray(steps)) return null;
  for (const step of steps) {
    if (!step || typeof step !== "object") continue;
    const row = step as { title?: unknown; href?: unknown; status?: unknown; reasonCode?: unknown };
    if (row.reasonCode === "REASSESS") continue;
    const status = row.status ?? "pending";
    if (status !== "pending") continue;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const href = typeof row.href === "string" ? row.href.trim() : "";
    if (!title || !href) continue;
    return { title, href };
  }
  return null;
}

/** Last AssessmentResult emergency-fund months. Empty is an em dash — never a fake 76. */
export function foldRunwayLabel(months: number | null | undefined): string {
  if (months == null || !Number.isFinite(months)) return "—";
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
