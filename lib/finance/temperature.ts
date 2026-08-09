/**
 * Temperature gauges — the canon gauge lines, in one place.
 *
 * These map a derived metric onto the four brand temperatures. They are pure
 * threshold functions: they take a already-computed number and return a colour
 * band, so they belong to neither the legacy snapshot nor the planner ledger.
 * Both previously carried byte-identical copies (lib/finance/store.ts and
 * lib/planner/derived.ts); those now re-export from here so the thresholds
 * cannot drift apart and colour the same number differently on two surfaces.
 *
 * Inputs are percent-scale where the metric is a percentage (dti = 28 means
 * 28%, not 0.28) — except cashFlowTemperature, which takes raw flow and income
 * and forms the ratio itself.
 */

export type Temperature = "emerald" | "yellow" | "amber" | "crimson";

/** DTI: ≤28% emerald · ≤36% yellow · ≤43% amber · >43% crimson */
export function dtiTemperature(dti: number): Temperature {
  if (dti <= 28) return "emerald";
  if (dti <= 36) return "yellow";
  if (dti <= 43) return "amber";
  return "crimson";
}

/** Savings rate: ≥20% emerald · ≥10% yellow · ≥0% amber · <0% crimson */
export function savingsRateTemperature(rate: number): Temperature {
  if (rate >= 20) return "emerald";
  if (rate >= 10) return "yellow";
  if (rate >= 0) return "amber";
  return "crimson";
}

/**
 * Runway: ≥6mo emerald · ≥3 yellow · ≥1 amber · <1 crimson.
 * Non-finite months reads as emerald — an infinite runway is the good case
 * (no essential outflow), not a missing value.
 */
export function runwayTemperature(months: number): Temperature {
  if (!Number.isFinite(months) || months >= 6) return "emerald";
  if (months >= 3) return "yellow";
  if (months >= 1) return "amber";
  return "crimson";
}

/** Cash-flow ratio (flow/income): ≥15% emerald · ≥5% yellow · ≥0% amber · <0 crimson */
export function cashFlowTemperature(flow: number, income: number): Temperature {
  if (income <= 0) return "amber";
  const ratio = flow / income;
  if (ratio >= 0.15) return "emerald";
  if (ratio >= 0.05) return "yellow";
  if (ratio >= 0) return "amber";
  return "crimson";
}
