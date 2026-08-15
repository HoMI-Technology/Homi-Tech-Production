export {
  PHASE0_PAUSE_COPY,
  PHASE0_RESOURCE_FRAME,
  PHASE0_RETURN_COPY,
  PHASE0_LEAVE_LABEL,
  PHASE0_START_FRESH_LABEL,
  PHASE0_COME_BACK_LABEL,
  PHASE0_BANNED_SURFACE_STRINGS,
  formatPhase0Until,
  renderPhase0ReturnCopy,
} from "./copy";
export {
  PHASE0_CATEGORIES,
  PHASE0_SIGNAL_IDS,
  PHASE0_SIGNAL_CATEGORY,
  scanPhase0Text,
  scanPhase0Texts,
  financialStressFromTexts,
  type Phase0Category,
  type Phase0SignalId,
  type Phase0TextHit,
} from "./signals";
export {
  PHASE0_MIN_SIGNALS,
  PHASE0_MIN_CATEGORIES,
  PHASE0_FREEZE_MS,
  evaluatePhase0,
  evaluatePhase0Signals,
  freezeUntilMs,
  type Phase0Evaluation,
  type Phase0NamedObservation,
} from "./detect";
export {
  selectPhase0Resources,
  formatPhase0ResourceLines,
  type Phase0Resource,
  type Phase0ResourceSlot,
} from "./resources";
export {
  PHASE0_FREEZE_KEY,
  PHASE0_LEDGER_KEY,
  PHASE0_PERSON_KEY,
  PHASE0_EVENT,
  PHASE0_GUEST_PERSON,
  rememberPhase0Person,
  loadKnownPhase0Person,
  personKeyForUserId,
  loadPhase0Freeze,
  isPhase0FreezeActive,
  freezeMatchesPerson,
  isFrozenForPerson,
  selectPhase0Surface,
  writePhase0Freeze,
  markPhase0FreezeSeen,
  phase0FreezeMode,
  clearPhase0Freeze,
  ingestPhase0Observation,
  recordAssessmentRestartLoop,
  recordNamedPhase0Signal,
  clearPartialAssessmentInputs,
  type Phase0FreezeRecord,
  type Phase0Surface,
} from "./store";

import { PHASE0_PAUSE_COPY, renderPhase0ReturnCopy } from "./copy";
import { formatPhase0ResourceLines, selectPhase0Resources } from "./resources";
import type { Phase0FreezeRecord } from "./store";

/** Same paragraph as the freeze screen — no second costume. */
export function buildPhase0AdvisorReply(
  record: Pick<Phase0FreezeRecord, "until" | "financialStress" | "selfHarm">,
  mode: "trip" | "return",
): string {
  const body = mode === "return" ? renderPhase0ReturnCopy(record.until) : PHASE0_PAUSE_COPY;
  const resources = formatPhase0ResourceLines(
    selectPhase0Resources({
      financialStress: record.financialStress,
      selfHarm: record.selfHarm,
    }),
  );
  return resources ? `${body}\n\n${resources}` : body;
}
