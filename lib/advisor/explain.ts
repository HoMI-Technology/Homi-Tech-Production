/**
 * "Why did this change" — the explainability engine. Turns the stored
 * assessment (current + previous snapshot) into a plain-language explanation
 * of score movement, expressed ONLY in magnitude bands (small / moderate /
 * large). Numeric pillar weights and the scoring formula never appear here —
 * transparency without leaking the canon (BUILD-BRIEF trade-secret rule;
 * blueprint Phase 3).
 *
 * Pure functions over StoredAssessment — the /results card and the
 * Companion's context both read from this one source, so the view and the
 * chat can never tell different stories.
 */

import { PILLAR_MAX_POINTS } from "@/lib/scoring";
import { findCrossedMilestone, type Milestone } from "@/lib/advisor/milestones";
import type { StoredAssessment } from "@/lib/assessment/storage";

export type MagnitudeBand = "small" | "moderate" | "large";
export type Direction = "up" | "down" | "flat";

export interface PillarMovement {
  key: "financial" | "emotional" | "timing";
  name: string;
  direction: Direction;
  band: MagnitudeBand | null;
  /** Plain-language sentence, e.g. "Financial Reality improved — a moderate move." */
  line: string;
}

export interface ScoreExplanation {
  /** "Your score moved from 63 to 71." / "Your score held at 71." */
  headline: string;
  /** Threshold crossing between the two scores, when one happened. */
  milestone: Milestone | null;
  /** One line per pillar, biggest movement first. Empty when pillar detail is unavailable. */
  movements: PillarMovement[];
  /** Honest limitation/staleness notes ("timing answers are 47 days old", …). */
  caveats: string[];
  /** Compact one-liner for the Companion's context note. */
  companionLine: string;
}

const PILLAR_NAMES = {
  financial: "Financial Reality",
  emotional: "Emotional Truth",
  timing: "Perfect Timing",
} as const;

/** Composite (0–100) delta → band. Zero is flat, not "small". */
function compositeBand(absDelta: number): MagnitudeBand {
  if (absDelta <= 3) return "small";
  if (absDelta <= 9) return "moderate";
  return "large";
}

/** Pillar delta normalized to % of that pillar's max → band. */
function pillarBand(absNormalizedPct: number): MagnitudeBand {
  if (absNormalizedPct <= 5) return "small";
  if (absNormalizedPct <= 15) return "moderate";
  return "large";
}

function movementLine(name: string, direction: Direction, band: MagnitudeBand | null): string {
  if (direction === "flat") return `${name} held steady.`;
  const verb = direction === "up" ? "improved" : "slipped";
  const size = band === "large" ? "a large move" : band === "moderate" ? "a moderate move" : "a small move";
  return `${name} ${verb} — ${size}.`;
}

/**
 * Builds the explanation. Returns null when there is no previous assessment —
 * a first score has nothing to compare against, and the surfaces say so
 * instead of inventing a story.
 */
export function buildScoreExplanation(stored: StoredAssessment): ScoreExplanation | null {
  const { result, previous } = stored;
  if (!previous) return null;

  const delta = result.score - previous.score;
  const headline =
    delta === 0
      ? `Your score held at ${result.score}.`
      : `Your score moved from ${previous.score} to ${result.score}.`;
  const milestone = findCrossedMilestone(previous.score, result.score);

  const caveats: string[] = [];
  const movements: PillarMovement[] = [];

  if (previous.pillars) {
    const current = {
      financial: result.financial.total,
      emotional: result.emotional.total,
      timing: result.timing.total,
    };
    for (const key of ["financial", "emotional", "timing"] as const) {
      const pillarDelta = current[key] - previous.pillars[key];
      const normalizedPct = Math.abs((pillarDelta / PILLAR_MAX_POINTS[key]) * 100);
      const direction: Direction = pillarDelta === 0 ? "flat" : pillarDelta > 0 ? "up" : "down";
      const band = direction === "flat" ? null : pillarBand(normalizedPct);
      movements.push({
        key,
        name: PILLAR_NAMES[key],
        direction,
        band,
        line: movementLine(PILLAR_NAMES[key], direction, band),
      });
    }
    // Biggest movement first; flat pillars last.
    movements.sort((a, b) => {
      const rank = (m: PillarMovement) =>
        m.direction === "flat" ? 0 : m.band === "large" ? 3 : m.band === "moderate" ? 2 : 1;
      return rank(b) - rank(a);
    });
  } else {
    caveats.push(
      "Only your previous total is on record, not the pillar detail — your next assessment unlocks the full breakdown.",
    );
  }

  const completedAt = Date.parse(stored.completedAt);
  if (!Number.isNaN(completedAt)) {
    const ageDays = Math.floor((Date.now() - completedAt) / 86_400_000);
    if (ageDays >= 90) {
      caveats.push(`This result is ${ageDays} days old — treat it as stale until you reassess.`);
    }
  }
  if (result.hardStops.length > 0) {
    caveats.push(
      `${result.hardStops.length} protective hard stop${result.hardStops.length === 1 ? " is" : "s are"} active — the verdict stays NOT YET until ${result.hardStops.length === 1 ? "it clears" : "they clear"}, whatever the number does.`,
    );
  }

  const driver = movements.find((m) => m.direction !== "flat");
  const compositeSize = delta === 0 ? null : compositeBand(Math.abs(delta));
  const companionLine =
    (delta === 0
      ? `Score unchanged at ${result.score} since the previous assessment.`
      : `Score ${delta > 0 ? "up" : "down"} ${Math.abs(delta)} (a ${compositeSize} move) since the previous assessment${driver ? `; main mover: ${driver.line.replace(/\.$/, "").toLowerCase()}` : ""}.`) +
    (milestone ? ` Milestone: ${milestone.line}` : "");

  return { headline, milestone, movements, caveats, companionLine };
}
