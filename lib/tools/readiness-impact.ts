/**
 * Client-safe readiness-impact types + pure helpers (Plans.md 6.4).
 *
 * Magnitude band lines never include scores or weights. Engine-backed
 * readinessImpactForHousing lives in readiness-bands.ts (server / tests only).
 */

import type { Direction, MagnitudeBand } from "@/lib/advisor/explain";

export interface ReadinessImpact {
  band: MagnitudeBand | null;
  direction: Direction;
  /** The hypothetical crosses a protective hard stop the baseline doesn't. */
  hardStop: boolean;
  /** Anchors came from neutral placeholders (no completed assessment). */
  neutral: boolean;
  /** Debt payments were estimated from the balance, not known. */
  debtEstimated: boolean;
  /** Number-free, weight-free sentence — CI-guarded to stay that way. */
  line: string;
}

export interface HousingImpactOptions {
  /** The new monthly housing obligation the lens computed. */
  monthlyObligation: number;
  /** Upfront cash leaving liquid savings (down payment, closing costs). */
  upfrontCost?: number;
  /** Current rent the obligation replaces, when the user says it does. */
  replacedRentMonthly?: number;
}

/** The digest-safe shape: magnitude and direction only. */
export interface ReadinessDigest {
  band: MagnitudeBand | null;
  direction: Direction;
  hardStop: boolean;
}

export function buildReadinessLine(
  direction: Direction,
  band: MagnitudeBand | null,
  hardStop: boolean,
): string {
  if (hardStop) {
    return "A move like this crosses one of your protective lines — the score simulator shows which one.";
  }
  if (direction === "flat") return "A move like this barely moves your readiness.";
  const size = band === "large" ? "significantly" : band === "moderate" ? "moderately" : "slightly";
  return direction === "down"
    ? `A move like this would pull your readiness ${size} downward.`
    : `A move like this would lift your readiness ${size}.`;
}

export function toReadinessDigest(impact: ReadinessImpact): ReadinessDigest {
  return { band: impact.band, direction: impact.direction, hardStop: impact.hardStop };
}
