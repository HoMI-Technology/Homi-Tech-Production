/**
 * Milestone moments — marking score-threshold crossings, harvested from the
 * companions-v2 prototype and re-voiced to canon: no emoji, no hype, honest
 * in both directions. A milestone is information, not a reward — downward
 * crossings are named as plainly as upward ones, in the protective register
 * ("not yet" is a map, not a verdict).
 *
 * Pure module: the explanation engine (lib/advisor/explain.ts) folds the
 * milestone into both the /results card and the Companion's context, so
 * every surface marks the same moment with the same words.
 */

export interface Milestone {
  threshold: number;
  direction: "up" | "down";
  line: string;
}

const THRESHOLDS = [40, 50, 60, 70, 80, 90] as const;

const UP_LINES: Record<number, string> = {
  40: "You crossed 40. Out of the fog.",
  50: "You crossed 50. Halfway — and that is real progress.",
  60: "You crossed 60. The path is getting clearer.",
  70: "You crossed 70. You are entering ready territory.",
  80: "You crossed 80. This is what readiness looks like.",
  90: "You crossed 90. Trust what you have built.",
};

const DOWN_LINES: Record<number, string> = {
  40: "You slipped below 40. Heavy, and worth naming — the map still works.",
  50: "You slipped below 50. Not a verdict on you; a signal to look at what moved.",
  60: "You slipped below 60. The picture got murkier. The next step did not change.",
  70: "You slipped below 70. Ready territory is still close.",
  80: "You slipped below 80. Still strong — look at what moved before it compounds.",
  90: "You slipped below 90. A dip at the top is information, not danger.",
};

/**
 * The milestone crossed between two scores, or null when none was.
 * Upward movement reports the HIGHEST threshold crossed (where you arrived);
 * downward movement reports the LOWEST (where you are now). A single move
 * yields at most one milestone — the one that describes the present.
 */
export function findCrossedMilestone(previous: number, current: number): Milestone | null {
  if (current > previous) {
    for (let i = THRESHOLDS.length - 1; i >= 0; i -= 1) {
      const t = THRESHOLDS[i];
      if (previous < t && current >= t) {
        return { threshold: t, direction: "up", line: UP_LINES[t] };
      }
    }
  } else if (current < previous) {
    for (const t of THRESHOLDS) {
      if (previous >= t && current < t) {
        return { threshold: t, direction: "down", line: DOWN_LINES[t] };
      }
    }
  }
  return null;
}
