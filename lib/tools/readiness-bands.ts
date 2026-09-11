import "server-only";

/**
 * Readiness bands — Decision Lab Phase 5 (server / test module).
 *
 * Answers "what would this move do to my readiness?" for a lens's
 * hypothetical, in magnitude language ONLY (small / moderate / large).
 * The composite delta is computed by the canonical engine via
 * lib/simulator.ts — clients must call POST /api/simulator instead
 * (Plans.md 6.4). Do not value-import this file from client components.
 */

import { simulate, type SimulatorAnchors, type SimulatorBaseline } from "@/lib/simulator";
import { compositeBand, type Direction } from "@/lib/advisor/explain";
import {
  buildReadinessLine,
  type HousingImpactOptions,
  type ReadinessImpact,
} from "@/lib/tools/readiness-impact";

export type {
  HousingImpactOptions,
  ReadinessDigest,
  ReadinessImpact,
} from "@/lib/tools/readiness-impact";
export { toReadinessDigest } from "@/lib/tools/readiness-impact";

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
    line: buildReadinessLine(direction, band, hardStop),
  };
}
