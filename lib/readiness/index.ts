export {
  buildReadinessPath,
  formatPathEventNotes,
  parsePathMarker,
  isPathCalendarEvent,
  pathStepEventDate,
  bindingConstraintLabel,
  normalizeReadinessPath,
  setPathStepStatus,
  HARD_STOP_ORDER,
  PATH_DISCLAIMER,
  MAX_PATH_STEPS,
  FIRST_STEP_MAX_DAYS,
  type PathStep,
  type PathStepKind,
  type PathStepStatus,
  type PathReasonCode,
  type PathConfidence,
  type PathMode,
  type ReadinessPath,
  type PathFinanceSnapshot,
  type BuildReadinessPathOptions,
} from "./path";

export {
  loadReadinessPath,
  saveReadinessPath,
  clearReadinessPath,
  pullReadinessPath,
  financeSnapshotForPath,
  generatePathFromLocalAssessment,
  generatePathFromResult,
  completePathStep,
  markPathCalendarCommitted,
  getFinanceSavedAtForPath,
  reconcilePathWithSignals,
  ensurePathForVerdict,
} from "./store";

export {
  completePathStepWithImpact,
  completePathStepGuarded,
  pathImpactToastCopy,
  parsePathStepImpact,
  isFreshPathImpact,
  publishPathImpact,
  consumeStoredPathImpact,
  clearStoredPathImpact,
  IMPACT_EVENT_NAME,
  LAST_IMPACT_KEY,
  LEGACY_LAST_IMPACT_KEY,
  IMPACT_HYDRATE_TTL_MS,
  type PathStepImpact,
  type PathTransitionMeta,
  type PathStepNoopReason,
  type CompletePathStepWithImpactResult,
  type CompletePathStepGuardedResult,
} from "./impact-bus";

export {
  computeBindingProgress,
  computePathFreshness,
  pathCompletionRatio,
  summarizePathResolution,
  ASSESSMENT_STALE_DAYS,
  PATH_STALE_DAYS,
  type BindingProgress,
  type PathFreshness,
  type PathStatusCounts,
  type PathResolutionSummary,
} from "./progress";

export {
  deriveFundingFromPath,
  applyPathFunding,
  type PathFundingSuggestion,
} from "./funding";

export { buildPathCoachPack, type PathCoachPack } from "./coach";

// Preflight (runPreflight / PREFLIGHT_DISCLAIMER) is intentionally NOT
// re-exported here — it value-imports the scoring engine (server-only, 6.5).
// Import from @/lib/readiness/preflight or POST /api/simulator instead.

export {
  autoCompletePathFromSignals,
  type AutoCompleteResult,
} from "./autocomplete";

export {
  loadCouplesAlignment,
  partnerPathNote,
  partnerBlocksJointReady,
  type CouplesAlignmentSnapshot,
} from "./partner";

export {
  loadRecurringCapacity,
  saveRecurringCapacity,
  totalRecurringMonthly,
  capacityAfterRecurring,
  recurringDragRatio,
  type RecurringItem,
  type RecurringCapacityState,
} from "./recurring";

export {
  runScenarioStudio,
  scenarioInputsFromFinance,
  SCENARIO_DISCLAIMER,
  type ScenarioStudioInput,
  type ScenarioStudioResult,
} from "./scenario";

export { generatePathFromScenario } from "./scenario-path";

export {
  PATH_FUNNEL_EVENTS,
  PATH_HABIT_FUNNEL_EVENTS,
  trackPathOffered,
  trackPathGenerated,
  trackPathSaved,
  trackPathCalendarCommitted,
  trackPathStepDone,
  trackPathFirstStepNudge,
  trackPathExported,
  trackPathPricingExposure,
  trackPathHabitImpression,
  trackPathPageViewed,
  trackPathStartStepClicked,
  trackPathReturnVisit,
  type PathFunnelSource,
  type PathStepDoneSurface,
} from "./analytics";

export {
  derivePathHabitStage,
  pathPendingStepCount,
  isPathReturnVisit,
  pathHabitOncePerSession,
  type PathHabitStage,
  type PathHabitSurface,
} from "./habit";

export {
  HOUSING_READINESS_DISCLAIMER,
  PATH_LEGAL_SHORT,
  PREFLIGHT_LEGAL_SHORT,
  SCENARIO_LEGAL_SHORT,
  HOUSEHOLD_LEGAL_SHORT,
  CERTIFICATE_LEGAL,
  HOUSING_COPY_BANNED,
} from "./legal";

export {
  completeStepWithEvidence,
  evidenceBasedAutoComplete,
  type EvidenceKind,
  type StepEvidence,
} from "./evidence";

export {
  loadPathHistory,
  archivePathVersion,
  clearPathHistory,
  type PathVersionRecord,
} from "./versions";

export {
  exportPathMarkdown,
  exportPathJson,
  downloadTextFile,
} from "./export";

export {
  getPathPricingAssignment,
  exposePathPricing,
  pathPricingCopy,
  type PathPricingVariant,
  type PathPricingAssignment,
} from "./pricing-experiment";
