/**
 * Future Self — a projected version of the user grounded in their current
 * Decision Readiness path. Educational only; never promises outcomes.
 * Complements `/twin` (full letter) with a short in-widget projection.
 */

import type { FutureSelfProjection, ReadinessPillar } from "@/types/companion";
import type { VerdictKey } from "@/lib/brand";

export interface FutureSelfInput {
  score?: number | null;
  verdict?: VerdictKey | null;
  /** Pillar percentages 0–100 when known. */
  pillars?: {
    financial?: number | null;
    emotional?: number | null;
    timing?: number | null;
  };
  /** Optional path progress 0–1. */
  pathProgress?: number | null;
  horizonYears?: 5 | 10;
}

function weakestPillar(
  pillars: FutureSelfInput["pillars"],
): ReadinessPillar | undefined {
  if (!pillars) return undefined;
  const entries: Array<[ReadinessPillar, number]> = [];
  if (typeof pillars.financial === "number") entries.push(["financial", pillars.financial]);
  if (typeof pillars.emotional === "number") entries.push(["emotional", pillars.emotional]);
  if (typeof pillars.timing === "number") entries.push(["timing", pillars.timing]);
  if (entries.length === 0) return undefined;
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

const PILLAR_LABEL: Record<ReadinessPillar, string> = {
  financial: "Financial Reality",
  emotional: "Emotional Truth",
  timing: "Perfect Timing",
};

/**
 * Build a short Future Self projection for HōMI to speak or show.
 */
export function projectFutureSelf(input: FutureSelfInput): FutureSelfProjection {
  const years = input.horizonYears ?? 5;
  const horizonLabel = `${years} years from now`;
  const weak = weakestPillar(input.pillars);
  const score = input.score ?? null;
  const verdict = input.verdict ?? null;

  if (score == null || verdict == null) {
    return {
      horizonLabel,
      projection:
        "Your future self is waiting on a clearer readiness picture. When you have a score, I can show you the path they're standing on — not a promise, just a mirror of today's direction.",
    };
  }

  const weakLine = weak
    ? ` The softest pillar today is ${PILLAR_LABEL[weak]} — that's usually what future-you remembers working on first.`
    : "";

  const progress =
    typeof input.pathProgress === "number"
      ? ` Your build path is about ${Math.round(input.pathProgress * 100)}% marked — future-you notices whether you kept walking, not whether every step was perfect.`
      : "";

  switch (verdict) {
    case "READY":
      return {
        horizonLabel,
        weakestPillar: weak,
        verdictHint: "READY",
        projection: `From ${horizonLabel}, a version of you with today's ${score} READY reading looks back and mostly remembers the quiet — the decision stopped dominating the room.${weakLine}${progress} This is a mirror of your current path, not a guarantee.`,
      };
    case "ALMOST_THERE":
      return {
        horizonLabel,
        weakestPillar: weak,
        verdictHint: "ALMOST THERE",
        projection: `From ${horizonLabel}, future-you remembers this ALMOST THERE stretch (${score}) as the last careful gap — close enough to feel the door, honest enough not to rush it.${weakLine}${progress} Projection only; your next moves still write the letter.`,
      };
    case "BUILD_FIRST":
      return {
        horizonLabel,
        weakestPillar: weak,
        verdictHint: "BUILD FIRST",
        projection: `From ${horizonLabel}, the BUILD FIRST chapter at ${score} is the load-bearing one — less glamorous, more decisive.${weakLine}${progress} I'm showing the path you're on now, not selling a finish line.`,
      };
    case "NOT_YET":
      return {
        horizonLabel,
        weakestPillar: weak,
        verdictHint: "DO NOT PROCEED",
        projection: `From ${horizonLabel}, future-you is often grateful for the NOT YET / DO NOT PROCEED pause at ${score} — protection that looked like delay from the inside.${weakLine}${progress} This is presence with your current truth, not a prediction.`,
      };
    default: {
      const _exhaustive: never = verdict;
      return _exhaustive;
    }
  }
}
