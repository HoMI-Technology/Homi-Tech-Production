export {
  computeScore,
  scoreToVerdict,
  buildAssessmentProvenance,
  type Verdict,
  type AssessmentInputs,
  type AssessmentResult,
  type AssessmentProvenance,
  type SelfReportedCreditBand,
  type CreditScoreProvenance,
  type FactorProvenance,
  type DownPaymentProvenance,
  type FinancialBreakdown,
  type EmotionalBreakdown,
  type TimingBreakdown,
  type HardStopReason,
  type HardStopCode,
  type ScoringWarning,
} from "./engine";
export { generateKeyInsight, generateNextSteps } from "./insights";
export { computeShadowScore, SHADOW_DEFAULTS, type ShadowInputs } from "./shadow";
export { PILLAR_MAX_POINTS } from "./weights";
