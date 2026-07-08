/**
 * Shared helper for building the assessment context payload sent to
 * /api/advisor. Used by both the full-page Chat and the CompanionWidget so
 * the two surfaces stay in sync about what the Companion knows.
 */

import { loadLocalResult } from "@/lib/assessment/storage";
import { PILLAR_MAX_POINTS } from "@/lib/scoring";
import type { AdvisorAssessmentContext } from "@/lib/advisor/fallback";

export function buildAssessmentContext(): AdvisorAssessmentContext | undefined {
  const stored = loadLocalResult();
  if (!stored) return undefined;
  const { result } = stored;
  return {
    score: result.score,
    verdict: result.verdict,
    pillars: {
      financial: Math.round((result.financial.total / PILLAR_MAX_POINTS.financial) * 100),
      emotional: Math.round((result.emotional.total / PILLAR_MAX_POINTS.emotional) * 100),
      timing: Math.round((result.timing.total / PILLAR_MAX_POINTS.timing) * 100),
    },
    hardStops: result.hardStops.map((h) => h.message),
  };
}
