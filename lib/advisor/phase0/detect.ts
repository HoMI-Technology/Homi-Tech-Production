/**
 * Phase 0 trip rule — the only freeze law:
 *   ≥2 signals from ≥2 of the 3 named categories.
 * A single signal never freezes. Two signals in one category never freeze.
 * Crisis is not a verdict.
 */

import {
  PHASE0_SIGNAL_CATEGORY,
  financialStressFromTexts,
  scanPhase0Texts,
  type Phase0Category,
  type Phase0SignalId,
  type Phase0TextHit,
} from "./signals";

export const PHASE0_MIN_SIGNALS = 2;
export const PHASE0_MIN_CATEGORIES = 2;
export const PHASE0_FREEZE_MS = 24 * 60 * 60 * 1000;

export interface Phase0NamedObservation {
  id: Phase0SignalId;
  financialStress?: boolean;
  selfHarm?: boolean;
}

export interface Phase0Evaluation {
  frozen: boolean;
  signalIds: Phase0SignalId[];
  categories: Phase0Category[];
  financialStress: boolean;
  selfHarm: boolean;
}

export function evaluatePhase0Signals(
  hits: readonly Pick<Phase0TextHit, "id" | "category" | "financialStress" | "selfHarm">[],
): Phase0Evaluation {
  const byId = new Map<Phase0SignalId, Phase0TextHit>();
  let financialStress = false;
  let selfHarm = false;
  for (const hit of hits) {
    financialStress = financialStress || Boolean(hit.financialStress);
    selfHarm = selfHarm || Boolean(hit.selfHarm);
    byId.set(hit.id, {
      id: hit.id,
      category: hit.category,
      financialStress: Boolean(hit.financialStress),
      selfHarm: Boolean(hit.selfHarm),
    });
  }
  const unique = [...byId.values()];
  const categories = [...new Set(unique.map((hit) => hit.category))];
  const frozen = unique.length >= PHASE0_MIN_SIGNALS && categories.length >= PHASE0_MIN_CATEGORIES;
  return {
    frozen,
    signalIds: unique.map((hit) => hit.id),
    categories,
    financialStress,
    selfHarm,
  };
}

export function evaluatePhase0(input: {
  texts?: readonly string[];
  named?: readonly Phase0NamedObservation[];
  /** From detectAcuteDistress — passed in so this module never imports crisis.ts. */
  selfHarm?: boolean;
}): Phase0Evaluation {
  const texts = input.texts ?? [];
  const textHits = scanPhase0Texts(texts);
  const selfHarm = Boolean(input.selfHarm);
  const financialStress = financialStressFromTexts(texts);

  const hits: Phase0TextHit[] = textHits.map((hit) => ({
    ...hit,
    financialStress: hit.financialStress || financialStress,
    selfHarm: hit.selfHarm || selfHarm,
  }));

  if (selfHarm && !hits.some((hit) => hit.id === "hopelessness")) {
    hits.push({
      id: "hopelessness",
      category: "language",
      financialStress,
      selfHarm: true,
    });
  }

  for (const named of input.named ?? []) {
    hits.push({
      id: named.id,
      category: PHASE0_SIGNAL_CATEGORY[named.id],
      financialStress: Boolean(named.financialStress) || financialStress,
      selfHarm: Boolean(named.selfHarm) || selfHarm,
    });
  }

  return evaluatePhase0Signals(hits);
}

export function freezeUntilMs(nowMs = Date.now()): number {
  return nowMs + PHASE0_FREEZE_MS;
}
