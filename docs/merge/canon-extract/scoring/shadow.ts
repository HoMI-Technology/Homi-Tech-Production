/**
 * Shadow Score — the 6-question quick read.
 * Canonical behavior: collect the six highest-signal inputs, fill the
 * remainder with neutral defaults, and run the full canonical engine.
 * Same math. Same thresholds. Just a faster read.
 */

import { computeScore, type AssessmentInputs, type AssessmentResult } from "./engine";

export interface ShadowInputs {
  debtToIncomeRatio: number;
  emergencyFundMonths: number;
  creditScore: number;
  confidenceLevel: number;
  fomoLevel: number;
  timeHorizonMonths: number;
}

/** Neutral defaults for the inputs the shadow flow does not collect. */
export const SHADOW_DEFAULTS: Omit<AssessmentInputs, keyof ShadowInputs> = {
  downPaymentPercent: 0.1,
  lifeStability: 6,
  partnerAlignment: null,
  savingsRate: 0.1,
  downPaymentProgress: 0.4,
};

export function computeShadowScore(inputs: ShadowInputs): AssessmentResult {
  return computeScore({ ...SHADOW_DEFAULTS, ...inputs });
}
