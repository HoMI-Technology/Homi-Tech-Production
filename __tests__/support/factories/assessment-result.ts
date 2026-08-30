/**
 * Typed AssessmentResult builder. Expected values stay literals in the test;
 * this only fills required fields so fixtures cannot silently drift.
 */
import type { AssessmentResult } from "@/lib/scoring/engine";

export function assessmentResult(
  overrides: Partial<AssessmentResult> = {},
): AssessmentResult {
  return {
    score: 45,
    verdict: "NOT_YET",
    financial: {
      debtToIncome: 0,
      downPayment: 0,
      emergencyFund: 0,
      creditHealth: 0,
      total: 0,
    },
    emotional: {
      lifeStability: 0,
      confidenceLevel: 0,
      partnerAlignment: 0,
      fomoCheck: 0,
      total: 0,
      singleRedistribution: false,
    },
    timing: {
      timeHorizon: 0,
      savingsRate: 0,
      downPaymentProgress: 0,
      total: 0,
    },
    hardStops: [],
    warnings: [],
    ...overrides,
  };
}
