import { VERDICT_META, type VerdictKey } from "@/lib/brand";

/**
 * Readiness calibration — shaping and interpreting the anonymized outcome
 * aggregates returned by the get_readiness_calibration() RPC. Pure functions.
 */

export interface CalibrationRow {
  verdict: VerdictKey;
  response_count: number;
  avg_satisfaction: number; // 1–5
  positive_rate: number; // 0–1
}

const VERDICT_ORDER: VerdictKey[] = ["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"];

/** Normalize raw RPC rows into a fixed-order, typed list (missing verdicts → zeroed). */
export function shapeCalibration(raw: Partial<CalibrationRow>[] | null): CalibrationRow[] {
  const byVerdict = new Map<string, Partial<CalibrationRow>>();
  for (const r of raw ?? []) {
    if (r.verdict) byVerdict.set(r.verdict, r);
  }
  return VERDICT_ORDER.map((verdict) => {
    const r = byVerdict.get(verdict);
    return {
      verdict,
      response_count: Number(r?.response_count ?? 0),
      avg_satisfaction: Number(r?.avg_satisfaction ?? 0),
      positive_rate: Number(r?.positive_rate ?? 0),
    };
  });
}

/** Total completed outcome surveys behind the calibration. */
export function totalResponses(rows: CalibrationRow[]): number {
  return rows.reduce((sum, r) => sum + r.response_count, 0);
}

/**
 * Product-calibration helper, not research validation.
 * Compares READY satisfaction with NOT_YET / BUILD_FIRST. Returns null until
 * both cohorts meet minCohort (default 5) — a privacy / noise floor, not a
 * scientific endpoint. Never present this as causal proof or a public
 * accuracy claim. See docs/research/HOMI_DECISION_READINESS_VALIDATION_PROTOCOL_V1.md.
 */
export function readinessDividend(
  rows: CalibrationRow[],
  minCohort = 5,
): {
  readyAvg: number;
  waitedAvg: number;
  deltaPct: number;
  readyPositive: number;
  waitedPositive: number;
} | null {
  const ready = rows.find((r) => r.verdict === "READY");
  const waited = rows.filter((r) => r.verdict === "NOT_YET" || r.verdict === "BUILD_FIRST");
  const waitedCount = waited.reduce((s, r) => s + r.response_count, 0);
  if (!ready || ready.response_count < minCohort || waitedCount < minCohort) return null;

  const waitedAvg =
    waited.reduce((s, r) => s + r.avg_satisfaction * r.response_count, 0) / waitedCount;
  const waitedPositive =
    waited.reduce((s, r) => s + r.positive_rate * r.response_count, 0) / waitedCount;

  const deltaPct = waitedAvg > 0 ? ((ready.avg_satisfaction - waitedAvg) / waitedAvg) * 100 : 0;

  return {
    readyAvg: ready.avg_satisfaction,
    waitedAvg,
    deltaPct,
    readyPositive: ready.positive_rate,
    waitedPositive,
  };
}

export function verdictLabel(v: VerdictKey): string {
  return VERDICT_META[v].label;
}
export function verdictColor(v: VerdictKey): string {
  return VERDICT_META[v].color;
}
