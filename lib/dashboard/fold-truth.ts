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

export function companionFoldLine(args: {
  hasHardStops: boolean;
  hasPath: boolean;
  hasAssessment: boolean;
}): string {
  if (args.hasHardStops) {
    return "A hard stop is the read right now. The path names what has to move first.";
  }
  if (args.hasAssessment && args.hasPath) {
    return "Your next honest move is the binding step on Path to Ready.";
  }
  if (args.hasAssessment) {
    return "You have a read. Path to Ready is the map from here.";
  }
  return "One measurement and this page has a build to show.";
}

/**
 * First-viewport instrument on signed-in Home. Hero is the honest 0–100
 * HōMI Score. Compass is the three-ring brand mark — it always draws
 * Financial / Emotional / Timing, which invents an empty third ring when
 * Emotional Truth was skipped, and it glows cheerfully next to
 * DO NOT PROCEED. Keep one. Not both.
 */
export const HOME_FOLD_INSTRUMENT = "hero" as const;

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
