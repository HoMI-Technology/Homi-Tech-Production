import type { AssessmentResult } from "@/lib/scoring/engine";
import type { VerdictKey } from "@/lib/brand";

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
  hardStops: AssessmentResult["hardStops"];
  warnings: AssessmentResult["warnings"];
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
  key: keyof Omit<AssessmentResult["emotional"], "total" | "singleRedistribution">;
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

function buildPillar(
  key: PillarKey,
  total: number,
  max: number,
  factors: SubFactor[],
): PillarScore {
  return { key, total, max, factors };
}

/**
 * Adapts the canonical repo `AssessmentResult` into the production-build
 * `ScoreResult` shape consumed by the readiness UI components.
 */
export function toScoreResult(result: AssessmentResult): ScoreResult {
  const { financial, emotional, timing } = result;

  return {
    score: result.score,
    verdict: result.verdict,
    hardStops: result.hardStops,
    warnings: result.warnings,
    pillars: {
      financial: buildPillar(
        "financial",
        financial.total,
        35,
        FINANCIAL_FACTORS.map((f) => ({
          ...f,
          pts: financial[f.key],
        })),
      ),
      emotional: buildPillar(
        "emotional",
        emotional.total,
        35,
        EMOTIONAL_FACTORS.map((f) => ({
          ...f,
          pts: emotional[f.key],
        })),
      ),
      timing: buildPillar(
        "timing",
        timing.total,
        30,
        TIMING_FACTORS.map((f) => ({
          ...f,
          pts: timing[f.key],
        })),
      ),
    },
  };
}
