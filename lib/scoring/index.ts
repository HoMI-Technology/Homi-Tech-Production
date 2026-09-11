/**
 * Scoring package barrel — types + the client-safe public seam only.
 *
 * Do not value-re-export the engine from here (Plans.md 6.5). An accidental
 * `import { computeScore } from "@/lib/scoring"` in a client module would
 * otherwise pull `lib/scoring/engine.ts` through this file.
 *
 * Server callers: `import { computeScore } from "@/lib/scoring/engine"`
 * Client values + types: `@/lib/scoring/public`
 */
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
export { PILLAR_MAX_POINTS, scoreToVerdict } from "./public";
