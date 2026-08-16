/**
 * Planner path barrel — production readiness path + SPA assessment adapter.
 * Scorer owns truth; path only sequences protective steps.
 */

export {
  PATH_DISCLAIMER,
  MAX_PATH_STEPS,
  FIRST_STEP_MAX_DAYS,
  HARD_STOP_ORDER,
  type PathStepKind,
  type PathReasonCode,
  type PathConfidence,
  type PathMode,
  type PathStepStatus,
  type PathStep,
  type ReadinessPath,
  type PathFinanceSnapshot,
  type BuildReadinessPathOptions,
  normalizeReadinessPath,
  setPathStepStatus,
  buildReadinessPath,
  bindingConstraintLabel,
  formatPathEventNotes,
  parsePathMarker,
  isPathCalendarEvent,
  pathStepEventDate,
} from "@/lib/readiness/path";

import type { AssessmentResult } from "@/lib/scoring/engine";
import type { ReadinessPath } from "@/lib/readiness/path";
import { HARD_STOP_MESSAGES, type ScoreResult } from "@/lib/score";

/** SPA-shaped assessment used by the planner store. */
export interface PathAssessment {
  score: number;
  verdict: AssessmentResult["verdict"];
  hardStops: Array<{
    code: AssessmentResult["hardStops"][number]["code"];
    message: string;
  }>;
  financial: AssessmentResult["financial"];
  emotional: AssessmentResult["emotional"];
  timing: AssessmentResult["timing"];
  warnings?: AssessmentResult["warnings"];
}

/**
 * Adapt planner ScoreResult → AssessmentResult for production buildReadinessPath.
 * Never re-derives scores or thresholds.
 */
export function assessmentFromScore(
  result: ScoreResult,
  opts?: { singleRedistribution?: boolean },
): AssessmentResult {
  if (result.assessment) {
    const a = result.assessment;
    if (opts?.singleRedistribution !== undefined) {
      return {
        ...a,
        emotional: {
          ...a.emotional,
          singleRedistribution: opts.singleRedistribution,
        },
      };
    }
    return a;
  }

  return {
    score: result.score,
    verdict: result.verdict,
    hardStops: result.hardStops.map((code) => ({
      code,
      message: HARD_STOP_MESSAGES[code],
    })),
    warnings: result.warnings.map((code) => ({
      code,
      message: code,
    })),
    financial: {
      total: result.pillars.financial.total,
      debtToIncome:
        result.pillars.financial.factors.find((f) => f.key === "dti")?.pts ?? 0,
      downPayment:
        result.pillars.financial.factors.find((f) => f.key === "downPayment")
          ?.pts ?? 0,
      emergencyFund:
        result.pillars.financial.factors.find((f) => f.key === "emergencyFund")
          ?.pts ?? 0,
      creditHealth:
        result.pillars.financial.factors.find((f) => f.key === "credit")?.pts ??
        0,
    },
    emotional: {
      total: result.pillars.emotional.total,
      lifeStability:
        result.pillars.emotional.factors.find((f) => f.key === "lifeStability")
          ?.pts ?? 0,
      confidenceLevel:
        result.pillars.emotional.factors.find((f) => f.key === "confidence")
          ?.pts ?? 0,
      partnerAlignment:
        result.pillars.emotional.factors.find(
          (f) => f.key === "partnerAlignment",
        )?.pts ?? 0,
      fomoCheck:
        result.pillars.emotional.factors.find((f) => f.key === "fomo")?.pts ??
        0,
      singleRedistribution: opts?.singleRedistribution ?? false,
    },
    timing: {
      total: result.pillars.timing.total,
      timeHorizon:
        result.pillars.timing.factors.find((f) => f.key === "timeHorizon")
          ?.pts ?? 0,
      savingsRate:
        result.pillars.timing.factors.find((f) => f.key === "savingsRate")
          ?.pts ?? 0,
      downPaymentProgress:
        result.pillars.timing.factors.find(
          (f) => f.key === "downPaymentProgress",
        )?.pts ?? 0,
    },
  };
}

/** Soft legal chrome used by planner UI. */
export const PATH_LEGAL_SHORT =
  "Not a commitment to lend. Not credit approval. Educational only — reassess before irreversible moves.";
export const PREFLIGHT_LEGAL_SHORT =
  "Protective check only. Not a loan decision or guarantee of affordability.";
export const CERTIFICATE_LEGAL =
  "This credential summarizes self-reported and product-computed readiness signals " +
  "at a point in time. It is not a credit report, appraisal, underwriting decision, " +
  "or commitment to lend. Partners may use it for education only.";

/** Completion ratio for path steps (planner progress UI). */
export function pathCompletionRatio(path: ReadinessPath): number {
  if (!path.steps.length) return 0;
  const done = path.steps.filter(
    (s) => s.status === "done" || s.status === "skipped",
  ).length;
  return done / path.steps.length;
}
