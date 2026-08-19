/**
 * Client-safe scoring surface (Plans.md 6.1).
 *
 * This is the ONLY module under lib/scoring that client code may
 * value-import. It carries exactly what the product already shows users:
 * pillar display maxima ("24/35") and the boundary-inclusive verdict
 * thresholds (READY ≥ 80 / ALMOST_THERE 65–79 / BUILD_FIRST 50–64 /
 * NOT_YET < 50) — both stated publicly in AGENTS.md and rendered in UI.
 *
 * Engine internals (sub-factor curves, warnings logic, insight generation,
 * WEIGHTS ratios) stay in the sibling modules, which become server-only in
 * 6.5. Type-only imports from ./engine remain safe everywhere — they are
 * erased at compile time and never execute the module.
 *
 * __tests__/scoring-public.test.ts pins this module to the engine so the
 * two can never drift.
 */

import type { Verdict } from "./engine";
import { VERDICT_CONFIG } from "./verdicts";

export type {
  Verdict,
  AssessmentInputs,
  AssessmentResult,
  AssessmentProvenance,
  SelfReportedCreditBand,
  CreditScoreProvenance,
  FactorProvenance,
  DownPaymentProvenance,
  FinancialBreakdown,
  EmotionalBreakdown,
  TimingBreakdown,
  HardStopReason,
  HardStopCode,
  ScoringWarning,
} from "./engine";
export type { ShadowInputs } from "./shadow";

/** Pillar display maxima — public output (every score bar renders "n / max"). */
export const PILLAR_MAX_POINTS = Object.freeze({
  financial: 35,
  emotional: 35,
  timing: 30,
});

/**
 * Boundary-inclusive verdict mapping, identical to the engine's
 * (parity-tested). Threshold literals live only in ./verdicts — the single
 * source of truth this seam and the engine both consume.
 */
export function scoreToVerdict(score: number): Verdict {
  if (score >= VERDICT_CONFIG.READY.min) return "READY";
  if (score >= VERDICT_CONFIG.ALMOST_THERE.min) return "ALMOST_THERE";
  if (score >= VERDICT_CONFIG.BUILD_FIRST.min) return "BUILD_FIRST";
  return "NOT_YET";
}
