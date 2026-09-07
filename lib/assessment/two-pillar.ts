import {
  PILLAR_MAX_POINTS,
  scoreToVerdict,
  type AssessmentResult,
} from "@/lib/scoring/public";

/**
 * Option 1: user skipped the entire Emotional Truth pillar.
 * The frozen engine still emits three pillars because AssessmentInputs
 * requires emotional fields. This overlay drops fake emo from the official
 * reading and rescales Financial + Timing onto 100 without touching WEIGHTS.
 *
 * Partner `solo` (partnerAlignment null) is a different mechanism — not this.
 */
export function applySkippedEmotionalReading(result: AssessmentResult): AssessmentResult {
  const financial = result.financial.total;
  const timing = result.timing.total;
  const max = PILLAR_MAX_POINTS.financial + PILLAR_MAX_POINTS.timing;
  const raw = max > 0 ? (financial + timing) / max * 100 : 0;
  const score = Math.round(raw * 10) / 10;
  const verdict = result.hardStops.length > 0 ? "NOT_YET" : scoreToVerdict(score);

  return {
    ...result,
    score,
    verdict,
    emotional: {
      lifeStability: 0,
      confidenceLevel: 0,
      partnerAlignment: 0,
      fomoCheck: 0,
      total: 0,
      singleRedistribution: false,
    },
    warnings: result.warnings.filter((warning) => {
      switch (warning.code) {
        case "FOMO_WARNING":
        case "PRESSURE_RUSH":
          return false;
        default:
          return true;
      }
    }),
  };
}
