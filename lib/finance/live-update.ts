/**
 * Live score derivation + band-change detection.
 *
 * Derives the three score-relevant numbers the finance dashboard already
 * knows (DTI, emergency-fund months, savings rate) from FinanceState, maps
 * them onto coarse scoring bands, and detects when a band boundary has been
 * crossed since the last stored assessment. Powers the dashboard re-check
 * prompt (components/dashboard/ScoreChangePrompt.tsx) and the periodic
 * detector (app/api/cron/score-triggers/route.ts).
 *
 * This module NEVER computes a score. The engine in lib/scoring is frozen
 * and server-only; the authoritative score comes from /api/scoring alone.
 * Everything here is a UI-level signal: bands are coarse buckets and the
 * point impact is a documented estimate, not engine output. Lives in
 * lib/finance (not lib/scoring) so the frozen tree stays untouched.
 *
 * Client-safe and SSR-safe: no server-only imports, all storage reads are
 * guarded behind `typeof window` via store.ts / assessment/storage.ts.
 */

import {
  debtToIncome,
  hasSavedFinanceState,
  loadFinanceState,
  runwayMonths,
  savingsRate,
  type FinanceState,
} from "@/lib/finance/store";
import { loadLocalResult } from "@/lib/assessment/storage";

/** DTI band boundaries in percent: <=28 / (28,36] / (36,43] / >43. */
export const DTI_BAND_THRESHOLDS = Object.freeze([28, 36, 43]);
/** Emergency-fund band boundaries in months: <1 / [1,3) / [3,6) / >=6. */
export const EMERGENCY_FUND_BAND_THRESHOLDS = Object.freeze([1, 3, 6]);
/** Savings-rate band boundaries in percent: <5 / [5,10) / [10,20) / >=20. */
export const SAVINGS_RATE_BAND_THRESHOLDS = Object.freeze([5, 10, 20]);

export type ScoreMetric = "dti" | "emergencyFund" | "savingsRate";

export const SCORE_METRIC_LABELS: Record<ScoreMetric, string> = {
  dti: "DTI",
  emergencyFund: "Emergency fund",
  savingsRate: "Savings rate",
};

/**
 * Estimated score points per band crossed, per metric. These are honest
 * UI heuristics for sizing the re-check nudge — NOT engine weights, which
 * stay sealed in the frozen server-only engine. The real delta is only
 * known after a reassessment through /api/scoring.
 */
export const ESTIMATED_POINTS_PER_BAND: Record<ScoreMetric, number> = {
  dti: 4,
  emergencyFund: 3,
  savingsRate: 3,
};

/** The three score-relevant numbers derived from finance data. */
export interface ScoreInputValues {
  /** Debt-to-income ratio as a percentage (e.g. 31 = 31%). */
  dtiPct: number;
  /** Months of total monthly outflow covered by liquid savings. */
  emergencyFundMonths: number;
  /** Net cash flow as a percentage of gross monthly income. */
  savingsRatePct: number;
}

/** Band indices (0 = lowest band) for each score-relevant metric. */
export interface ScoreBandSnapshot {
  dti: number;
  emergencyFund: number;
  savingsRate: number;
}

export interface BandChange {
  metric: ScoreMetric;
  label: string;
  oldBand: number;
  newBand: number;
  /** "improved" moves toward the band the engine rewards for that metric. */
  direction: "improved" | "worsened";
  /** Signed estimate: positive when the change likely raised the score. */
  estimatedPointImpact: number;
}

export interface ScoreRelevantChange {
  changed: boolean;
  changes: BandChange[];
  /** Sum of per-metric signed estimates. */
  estimatedPointImpact: number;
  detectedAt: string;
}

/**
 * Derives score-relevant inputs from the finance dashboard state. Reuses the
 * store's own derived reads so the dashboard and this module can never drift.
 * Runway is unbounded (Infinity) when there is no monthly outflow — you
 * cannot outrun expenses you do not have; it lands in the top band.
 */
export function deriveScoreInputs(state: FinanceState): ScoreInputValues {
  return {
    dtiPct: debtToIncome(state),
    emergencyFundMonths: runwayMonths(state),
    savingsRatePct: savingsRate(state),
  };
}

/** DTI band: count of thresholds the value exceeds (lower DTI is better). */
export function dtiBand(dtiPct: number): number {
  return DTI_BAND_THRESHOLDS.reduce((band, t) => (dtiPct > t ? band + 1 : band), 0);
}

/** Emergency-fund band: count of thresholds met (more runway is better). */
export function emergencyFundBand(months: number): number {
  return EMERGENCY_FUND_BAND_THRESHOLDS.reduce((band, t) => (months >= t ? band + 1 : band), 0);
}

/** Savings-rate band: count of thresholds met (higher rate is better). */
export function savingsRateBand(ratePct: number): number {
  return SAVINGS_RATE_BAND_THRESHOLDS.reduce((band, t) => (ratePct >= t ? band + 1 : band), 0);
}

/** Band snapshot from raw values (percent / months / percent). */
export function snapshotFromValues(values: ScoreInputValues): ScoreBandSnapshot {
  return {
    dti: dtiBand(values.dtiPct),
    emergencyFund: emergencyFundBand(values.emergencyFundMonths),
    savingsRate: savingsRateBand(values.savingsRatePct),
  };
}

/** Band snapshot from the current finance dashboard state. */
export function snapshotFromFinanceState(state: FinanceState): ScoreBandSnapshot {
  return snapshotFromValues(deriveScoreInputs(state));
}

/** Minimal slice of the engine's AssessmentInputs this module reads. */
export interface AssessmentScoreInputs {
  /** 0-1 ratio (e.g. 0.28 = 28%), per the engine contract. */
  debtToIncomeRatio: number;
  /** Months of living expenses in emergency fund. */
  emergencyFundMonths: number;
  /** 0-1 ratio (e.g. 0.20 = 20%), per the engine contract. */
  savingsRate: number;
}

/**
 * Band snapshot from a stored assessment's inputs. Returns null when any of
 * the three numbers is missing or non-finite (older payloads, other decision
 * verticals) — an unreadable baseline must never fabricate a change.
 */
export function snapshotFromAssessmentInputs(
  inputs: Partial<AssessmentScoreInputs> | null | undefined,
): ScoreBandSnapshot | null {
  if (!inputs) return null;
  const { debtToIncomeRatio, emergencyFundMonths, savingsRate: rate } = inputs;
  if (
    !Number.isFinite(debtToIncomeRatio) ||
    !Number.isFinite(emergencyFundMonths) ||
    !Number.isFinite(rate)
  ) {
    return null;
  }
  return snapshotFromValues({
    dtiPct: (debtToIncomeRatio as number) * 100,
    emergencyFundMonths: emergencyFundMonths as number,
    savingsRatePct: (rate as number) * 100,
  });
}

/** Lower band index is better for DTI; higher is better for the other two. */
function isImprovement(metric: ScoreMetric, oldBand: number, newBand: number): boolean {
  return metric === "dti" ? newBand < oldBand : newBand > oldBand;
}

/**
 * Compares two band snapshots and reports every metric that crossed a band.
 * The estimated point impact is the per-metric estimate scaled by bands
 * crossed, signed by direction — a sizing hint for the nudge, never a score.
 */
export function detectScoreRelevantChanges(
  previous: ScoreBandSnapshot,
  current: ScoreBandSnapshot,
): ScoreRelevantChange {
  const changes: BandChange[] = [];
  for (const metric of ["dti", "emergencyFund", "savingsRate"] as const) {
    const oldBand = previous[metric];
    const newBand = current[metric];
    if (oldBand === newBand) continue;
    const improved = isImprovement(metric, oldBand, newBand);
    const magnitude = Math.abs(newBand - oldBand) * ESTIMATED_POINTS_PER_BAND[metric];
    changes.push({
      metric,
      label: SCORE_METRIC_LABELS[metric],
      oldBand,
      newBand,
      direction: improved ? "improved" : "worsened",
      estimatedPointImpact: improved ? magnitude : -magnitude,
    });
  }
  return {
    changed: changes.length > 0,
    changes,
    estimatedPointImpact: changes.reduce((sum, c) => sum + c.estimatedPointImpact, 0),
    detectedAt: new Date().toISOString(),
  };
}

/**
 * Client-side entry point: compares the last stored assessment's band
 * snapshot against the current finance dashboard numbers.
 *
 * Returns null when there is nothing honest to compare — no completed local
 * assessment, an unreadable baseline, or finance numbers the user never
 * saved (quoting the store's placeholder defaults as "your numbers" would
 * be a lie, see hasSavedFinanceState). A compared-but-unchanged result comes
 * back as `{ changed: false }`.
 */
export function checkLiveScoreTriggers(): ScoreRelevantChange | null {
  if (typeof window === "undefined") return null;
  const stored = loadLocalResult();
  if (!stored) return null;
  if (!hasSavedFinanceState()) return null;
  const baseline = snapshotFromAssessmentInputs(stored.inputs);
  if (!baseline) return null;
  return detectScoreRelevantChanges(baseline, snapshotFromFinanceState(loadFinanceState()));
}

/**
 * Stable identity of a detected change, keyed to the assessment it is
 * measured against. The dashboard prompt stores this on dismissal so the
 * same change never nags twice, while a NEW change (or a new assessment)
 * re-prompts.
 */
export function scoreTriggerSignature(change: ScoreRelevantChange, assessedAt: string): string {
  const legs = change.changes.map((c) => `${c.metric}:${c.oldBand}>${c.newBand}`).join(",");
  return `${assessedAt}|${legs}`;
}
