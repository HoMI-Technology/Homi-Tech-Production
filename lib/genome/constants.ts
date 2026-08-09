/**
 * Behavioral Genome — dashboard display constants.
 * Keys match lib/genome/dimensions.ts (live 9-dim model).
 * Spec keys like risk_tolerance were never in production schema.
 */

import { DIMENSIONS, type DimensionKey } from "@/lib/genome/dimensions";

const COLORS = [
  "#22d3ee",
  "#34d399",
  "#facc15",
  "#fab633",
  "#f472b6",
  "#a78bfa",
  "#22d3ee",
  "#34d399",
  "#facc15",
] as const;

/** Short labels for compact dashboard bars. */
const SHORT_LABELS: Record<DimensionKey, string> = {
  loss_aversion: "Loss",
  time_perception: "Time",
  confidence_calibration: "Confidence",
  volatility_tolerance: "Volatility",
  regret_asymmetry: "Regret",
  narrative_dependence: "Narrative",
  social_reference: "Social",
  outcome_attribution: "Outcome",
  agency_perception: "Agency",
};

export const GENOME_DIMENSIONS = DIMENSIONS.map((dim, i) => ({
  key: dim.key,
  name: dim.name,
  label: SHORT_LABELS[dim.key],
  description: dim.description,
  color: COLORS[i % COLORS.length],
}));

export type GenomeDimensionMeta = (typeof GENOME_DIMENSIONS)[number];
export type GenomeKey = DimensionKey;

/**
 * Resolve 0–100 score from behavioral_genome.scores.
 * Accepts DimensionScore[] or flat Record<key, number>.
 */
export function scoreFromGenomePayload(scores: unknown, key: DimensionKey | string): number | null {
  if (scores == null) return null;
  if (Array.isArray(scores)) {
    const hit = scores.find(
      (s) =>
        s &&
        typeof s === "object" &&
        "key" in s &&
        (s as { key: string }).key === key &&
        typeof (s as { score?: unknown }).score === "number",
    ) as { score: number } | undefined;
    return hit ? Math.round(hit.score) : null;
  }
  if (typeof scores === "object") {
    const v = (scores as Record<string, unknown>)[key];
    if (typeof v === "number") return Math.round(v);
    if (v && typeof v === "object" && typeof (v as { score?: unknown }).score === "number") {
      return Math.round((v as { score: number }).score);
    }
  }
  return null;
}

/** Flatten genome scores into Record for GenomeWidget. */
export function genomeScoresMap(scores: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const dim of GENOME_DIMENSIONS) {
    const v = scoreFromGenomePayload(scores, dim.key);
    if (v != null) out[dim.key] = v;
  }
  return out;
}
