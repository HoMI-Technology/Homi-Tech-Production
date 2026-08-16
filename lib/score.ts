/**
 * Planner-facing score adapter.
 *
 * Scorer-owns-truth: all numbers come from `@/lib/scoring` (production SSOT).
 * This module only reshapes AssessmentResult into the planner SPA view model
 * (pillars + hard-stop keys) so closed-loop UI can port without a second engine.
 */

import {
  computeScore as prodComputeScore,
  type AssessmentInputs,
  type AssessmentResult,
  type HardStopCode,
  type Verdict,
} from "@/lib/scoring/engine";
import { PILLAR_MAX_POINTS } from "@/lib/scoring/weights";
import {
  VERDICT_META as BRAND_VERDICT_META,
  PILLARS as BRAND_PILLARS,
  type VerdictKey as BrandVerdictKey,
} from "@/lib/brand";

export type { AssessmentInputs };
export type PillarKey = "financial" | "emotional" | "timing";
export type VerdictKey = Verdict;
export type HardStopKey = HardStopCode;
export type WarningKey = "FOMO_WARNING" | "PRESSURE_RUSH";

export type SubFactor = { key: string; label: string; pts: number; max: number };
export type PillarScore = {
  key: PillarKey;
  total: number;
  max: number;
  factors: SubFactor[];
};

/** Planner view model — pillars + hard-stop keys (not HardStopReason objects). */
export type ScoreResult = {
  score: number;
  verdict: VerdictKey;
  pillars: Record<PillarKey, PillarScore>;
  hardStops: HardStopKey[];
  warnings: WarningKey[];
  /** Production engine result (path / insights). */
  assessment: AssessmentResult;
};

export { PILLAR_MAX_POINTS };

export const PILLARS: Record<
  PillarKey,
  { label: string; question: string; max: number }
> = {
  financial: {
    label: "Financial Reality",
    question: "Can you afford it?",
    max: PILLAR_MAX_POINTS.financial,
  },
  emotional: {
    label: "Emotional Truth",
    question: "Do you really want it?",
    max: PILLAR_MAX_POINTS.emotional,
  },
  timing: {
    label: "Perfect Timing",
    question: "Is now the right moment?",
    max: PILLAR_MAX_POINTS.timing,
  },
};

/** Brand verdict chrome with SPA-shaped { label, line } access. */
export const VERDICT_META: Record<VerdictKey, { label: string; line: string }> = {
  READY: {
    label: BRAND_VERDICT_META.READY.label,
    line: BRAND_VERDICT_META.READY.line,
  },
  ALMOST_THERE: {
    label: BRAND_VERDICT_META.ALMOST_THERE.label,
    line: BRAND_VERDICT_META.ALMOST_THERE.line,
  },
  BUILD_FIRST: {
    label: BRAND_VERDICT_META.BUILD_FIRST.label,
    line: BRAND_VERDICT_META.BUILD_FIRST.line,
  },
  NOT_YET: {
    label: BRAND_VERDICT_META.NOT_YET.label,
    line: BRAND_VERDICT_META.NOT_YET.line,
  },
};

void BRAND_PILLARS; // keep brand import stable for tree-shaking audits
void (0 as BrandVerdictKey | 0);

export const HARD_STOP_MESSAGES: Record<HardStopKey, string> = {
  DTI_OVER_50:
    "Your debt-to-income ratio is above 50%. Buying right now would leave almost no margin for surprises.",
  HOUSING_RATIO_OVER_45:
    "The home you are considering would consume more than 45% of your monthly income. That is the line where one bad month becomes a crisis.",
  RUNWAY_UNDER_1_MONTH:
    "You have less than one month of expenses set aside. Owning a home means owning the surprises that come with it — you need runway first.",
  CREDIT_UNDER_620:
    "Your credit score is below 620. Lenders will price this as high-risk, and the interest cost alone could undo the purchase. Build credit first; you protect yourself by waiting.",
};

export const WARNING_MESSAGES: Record<WarningKey, string> = {
  FOMO_WARNING:
    "All emotional indicators are at their optimal values. Take a moment to honestly reassess — buying a home is one of the biggest decisions you will make, and honesty here protects you.",
  PRESSURE_RUSH:
    "High external pressure combined with a very short timeline. Consider whether you are being rushed into a decision.",
};

/** Map production AssessmentResult → planner ScoreResult (no re-scoring). */
export function assessmentToScoreResult(result: AssessmentResult): ScoreResult {
  const warnings: WarningKey[] = [];
  for (const w of result.warnings) {
    if (w.code === "FOMO_WARNING" || w.code === "PRESSURE_RUSH") {
      warnings.push(w.code);
    }
  }

  return {
    score: result.score,
    verdict: result.verdict,
    hardStops: result.hardStops.map((h) => h.code),
    warnings,
    assessment: result,
    pillars: {
      financial: {
        key: "financial",
        max: PILLAR_MAX_POINTS.financial,
        total: result.financial.total,
        factors: [
          {
            key: "dti",
            label: "Debt-to-income",
            pts: result.financial.debtToIncome,
            max: 10,
          },
          {
            key: "downPayment",
            label: "Down payment",
            pts: result.financial.downPayment,
            max: 10,
          },
          {
            key: "emergencyFund",
            label: "Emergency fund",
            pts: result.financial.emergencyFund,
            max: 8,
          },
          {
            key: "credit",
            label: "Credit health",
            pts: result.financial.creditHealth,
            max: 7,
          },
        ],
      },
      emotional: {
        key: "emotional",
        max: PILLAR_MAX_POINTS.emotional,
        total: result.emotional.total,
        factors: [
          {
            key: "lifeStability",
            label: "Life stability",
            pts: result.emotional.lifeStability,
            max: 9,
          },
          {
            key: "confidence",
            label: "Confidence",
            pts: result.emotional.confidenceLevel,
            max: 9,
          },
          {
            key: "partnerAlignment",
            label: "Partner alignment",
            pts: result.emotional.partnerAlignment,
            max: 9,
          },
          {
            key: "fomo",
            label: "FOMO (inverted)",
            pts: result.emotional.fomoCheck,
            max: 8,
          },
        ],
      },
      timing: {
        key: "timing",
        max: PILLAR_MAX_POINTS.timing,
        total: result.timing.total,
        factors: [
          {
            key: "timeHorizon",
            label: "Time horizon",
            pts: result.timing.timeHorizon,
            max: 10,
          },
          {
            key: "savingsRate",
            label: "Savings rate",
            pts: result.timing.savingsRate,
            max: 10,
          },
          {
            key: "downPaymentProgress",
            label: "Down-payment progress",
            pts: result.timing.downPaymentProgress,
            max: 10,
          },
        ],
      },
    },
  };
}

/** Pure entry — production engine only. */
export function computeScore(inputs: AssessmentInputs): ScoreResult {
  return assessmentToScoreResult(prodComputeScore(inputs));
}
