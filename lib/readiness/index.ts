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
} from "./store";

export {
  computeBindingProgress,
  computePathFreshness,
  pathCompletionRatio,
  ASSESSMENT_STALE_DAYS,
  PATH_STALE_DAYS,
  type BindingProgress,
  type PathFreshness,
} from "./progress";

export {
  deriveFundingFromPath,
  applyPathFunding,
  type PathFundingSuggestion,
} from "./funding";

export { buildPathCoachPack, type PathCoachPack } from "./coach";

export {
  runPreflight,
  PREFLIGHT_DISCLAIMER,
  type PreflightInput,
  type PreflightResult,
  type PreflightFinding,
  type PreflightVerdict,
} from "./preflight";

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
