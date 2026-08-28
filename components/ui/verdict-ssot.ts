/**
 * Verdict UI SSOT helpers — single mapping path for badge / bar / pill.
 *
 * Band thresholds live only in `@/lib/scoring/public` (`scoreToVerdict`).
 * Display labels/colors live only in `VERDICT_META` (ADR-001: NOT_YET →
 * "DO NOT PROCEED"). Callers must not redeclare 80/65/50 here.
 */

import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import { TEMP_HEX } from "@/lib/planner/palette";
import type { Temperature } from "@/lib/planner/types";
import { scoreToVerdict } from "@/lib/scoring/public";

/** Verdict band → planner temperature key (Cool → Hot metaphor). */
export const VERDICT_TEMPERATURE: Record<VerdictKey, Temperature> = {
  READY: "emerald",
  ALMOST_THERE: "yellow",
  BUILD_FIRST: "amber",
  NOT_YET: "crimson",
};

export type HardStopsInput = boolean | number | { length: number } | readonly unknown[] | null | undefined;

/** True when hard stops force the protective NOT_YET band. */
export function hasHardStops(hardStops?: HardStopsInput): boolean {
  if (hardStops == null || hardStops === false) return false;
  if (hardStops === true) return true;
  if (typeof hardStops === "number") return hardStops > 0;
  return hardStops.length > 0;
}

/**
 * Resolve a VerdictKey from an explicit verdict, or from score + optional
 * hardStops via the public scoring seam. Prefer this over inline thresholds.
 */
export function resolveVerdictKey(opts: {
  verdict?: VerdictKey | null;
  score?: number | null;
  hardStops?: HardStopsInput;
}): VerdictKey {
  // Hard-stops outrank an explicit verdict. Path snapshots and scoreToVerdict
  // can still carry ALMOST_THERE at 65 after the engine has already forced
  // NOT_YET — displaying the stored adjective is the contradiction.
  if (hasHardStops(opts.hardStops)) return "NOT_YET";
  if (opts.verdict != null) return opts.verdict;
  if (opts.score == null || !Number.isFinite(opts.score)) {
    throw new TypeError(
      "Verdict UI SSOT requires either `verdict` or a finite `score` (via scoreToVerdict).",
    );
  }
  return scoreToVerdict(opts.score);
}

/** Brand meta for a resolved verdict (label, color, temperature copy). */
export function verdictMetaFor(verdict: VerdictKey) {
  return VERDICT_META[verdict];
}

/** Fill/stroke hex for gauges — TEMP_HEX keyed by verdict temperature. */
export function verdictTempHex(verdict: VerdictKey): string {
  return TEMP_HEX[VERDICT_TEMPERATURE[verdict]];
}

/**
 * Map a value/max ratio onto the public 0–100 score scale so sub-metrics
 * share the same four-band coloring as the composite score.
 */
export function ratioToScore(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}
