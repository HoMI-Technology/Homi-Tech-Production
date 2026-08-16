/**
 * Readiness bands — Decision Lab Phase 5.
 *
 * Answers "what would this move do to my readiness?" for a lens's
 * hypothetical, in magnitude language ONLY (small / moderate / large) —
 * the same bands the explainability engine uses for real score movement.
 * The composite delta is computed by the canonical engine via
 * lib/simulator.ts; what leaves this module is the band and the direction,
 * never the number, never the weights (BUILD-BRIEF trade-secret rule).
 *
 * Honesty flags travel with every impact: neutral anchors (no assessment
 * yet) and estimated debt payments (Plaid baselines) are labeled wherever
 * the band renders.
 */

import {
  simulate,
  type SimulatorAnchors,
  type SimulatorBaseline,
} from "@/lib/simulator";
import { compositeBand, type Direction, type MagnitudeBand } from "@/lib/advisor/explain";

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

function buildLine(direction: Direction, band: MagnitudeBand | null, hardStop: boolean): string {
  if (hardStop) {
    return "A move like this crosses one of your protective lines — the score simulator shows which one.";
  }
  if (direction === "flat") return "A move like this barely moves your readiness.";
  const size = band === "large" ? "significantly" : band === "moderate" ? "moderately" : "slightly";
  return direction === "down"
    ? `A move like this would pull your readiness ${size} downward.`
    : `A move like this would lift your readiness ${size}.`;
}

/**
 * Simulates a housing hypothetical against the user's baseline and returns
 * the magnitude of the composite shift. Runs the canonical engine twice
 * (baseline vs hypothetical) — the obligation enters as extraDebtService so
 * the engine sees it exactly once in both DTI and outflow.
 *
 * Returns null when there is no usable baseline (nothing saved / no income)
 * — the UI shows nothing rather than a band built on air.
 */
export function readinessImpactForHousing(
  baseline: SimulatorBaseline,
  anchors: SimulatorAnchors,
  opts: HousingImpactOptions,
): ReadinessImpact | null {
  if (baseline.source === "empty" || baseline.monthlyIncome <= 0) return null;
  if (!Number.isFinite(opts.monthlyObligation) || opts.monthlyObligation < 0) return null;

  const replaced = Math.max(0, opts.replacedRentMonthly ?? 0);
  const upfront = Math.max(0, opts.upfrontCost ?? 0);
  const hypothetical = {
    ...baseline,
    monthlyExpenses: Math.max(0, baseline.monthlyExpenses - replaced),
    liquidSavings: Math.max(0, baseline.liquidSavings - upfront),
  };

  const base = simulate(baseline, baseline, anchors);
  const hypo = simulate(hypothetical, baseline, anchors, {
    extraDebtService: opts.monthlyObligation,
  });

  const delta = hypo.compositeScore - base.compositeScore;
  const direction: Direction = delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  const band = direction === "flat" ? null : compositeBand(Math.abs(delta));
  const hardStop = hypo.hardStops.length > base.hardStops.length;

  return {
    band,
    direction,
    hardStop,
    neutral: anchors.neutral,
    debtEstimated: hypo.debtPaymentsEstimated,
    line: buildLine(direction, band, hardStop),
  };
}

/** The digest-safe shape: magnitude and direction only. */
export interface ReadinessDigest {
  band: MagnitudeBand | null;
  direction: Direction;
  hardStop: boolean;
}

export function toReadinessDigest(impact: ReadinessImpact): ReadinessDigest {
  return { band: impact.band, direction: impact.direction, hardStop: impact.hardStop };
}
