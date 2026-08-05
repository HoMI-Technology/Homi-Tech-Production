/**
 * AssessmentResult → pillar ScoreResult for planner UI.
 * Lives in lib/ (not components/) so score-bridge stays free of UI imports.
 */

import type {
  AssessmentResult,
  HardStopReason,
  ScoringWarning,
} from "@/lib/scoring/public";
import type { VerdictKey } from "@/lib/brand";
import { PILLAR_MAX_POINTS } from "@/lib/scoring/public";

export type PillarKey = "financial" | "emotional" | "timing";

export type SubFactor = {
  key: string;
  label: string;
  pts: number;
  max: number;
};

export type PillarScore = {
  key: PillarKey;
  total: number;
  max: number;
  factors: SubFactor[];
};

export type ScoreResult = {
  score: number;
  verdict: VerdictKey;
  pillars: Record<PillarKey, PillarScore>;
  hardStops: HardStopReason[];
  warnings: ScoringWarning[];
};

const FINANCIAL_FACTORS: {
  key: keyof Omit<AssessmentResult["financial"], "total">;
  label: string;
  max: number;
}[] = [
  { key: "debtToIncome", label: "Debt-to-income", max: 10 },
  { key: "downPayment", label: "Down payment", max: 10 },
  { key: "emergencyFund", label: "Emergency fund", max: 8 },
  { key: "creditHealth", label: "Credit health", max: 7 },
];

const EMOTIONAL_FACTORS: {
  key: keyof Omit<
    AssessmentResult["emotional"],
    "total" | "singleRedistribution"
  >;
  label: string;
  max: number;
}[] = [
  { key: "lifeStability", label: "Life stability", max: 9 },
  { key: "confidenceLevel", label: "Confidence", max: 9 },
  { key: "partnerAlignment", label: "Partner alignment", max: 9 },
  { key: "fomoCheck", label: "FOMO (inverted)", max: 8 },
];

const TIMING_FACTORS: {
  key: keyof Omit<AssessmentResult["timing"], "total">;
  label: string;
  max: number;
}[] = [
  { key: "timeHorizon", label: "Time horizon", max: 10 },
  { key: "savingsRate", label: "Savings rate", max: 10 },
  { key: "downPaymentProgress", label: "Down-payment progress", max: 10 },
];

export function toScoreResult(result: AssessmentResult): ScoreResult {
  const { financial, emotional, timing } = result;

  return {
    score: result.score,
    verdict: result.verdict,
    hardStops: result.hardStops,
    warnings: result.warnings,
    pillars: {
      financial: {
        key: "financial",
        total: financial.total,
        max: PILLAR_MAX_POINTS.financial,
        factors: FINANCIAL_FACTORS.map((f) => ({
          ...f,
          pts: financial[f.key],
        })),
      },
      emotional: {
        key: "emotional",
        total: emotional.total,
        max: PILLAR_MAX_POINTS.emotional,
        factors: EMOTIONAL_FACTORS.map((f) => ({
          ...f,
          pts: emotional[f.key],
        })),
      },
      timing: {
        key: "timing",
        total: timing.total,
        max: PILLAR_MAX_POINTS.timing,
        factors: TIMING_FACTORS.map((f) => ({
          ...f,
          pts: timing[f.key],
        })),
      },
    },
  };
}
