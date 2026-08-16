export {
  computeScore,
  scoreToVerdict,
  type Verdict,
  type AssessmentInputs,
  type AssessmentResult,
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
