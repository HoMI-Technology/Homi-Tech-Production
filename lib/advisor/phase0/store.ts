/**
 * Phase 0 freeze + signal ledger. 24h, per person, never household/partner.
 *
 * localStorage only (no cookies, no PostHog, no household table). Partner
 * isolation is the personKey on every record — a different signed-in user
 * on the same browser does not inherit the freeze.
 */

import { clearDraft } from "@/lib/assessment/draft";
import { clearShadowDraft } from "@/lib/assessment/shadow-draft";
import { evaluatePhase0, freezeUntilMs, PHASE0_FREEZE_MS } from "./detect";
import {
  PHASE0_SIGNAL_CATEGORY,
  type Phase0Category,
  type Phase0SignalId,
} from "./signals";
import type { Phase0Evaluation, Phase0NamedObservation } from "./detect";

export const PHASE0_FREEZE_KEY = "homi:phase0-freeze";
export const PHASE0_LEDGER_KEY = "homi:phase0-signals";
export const PHASE0_PERSON_KEY = "homi:phase0-person";
export const PHASE0_JUST_TRIPPED_KEY = "homi:phase0-just-tripped";
export const PHASE0_RESTART_KEY = "homi:phase0-restarts";
export const PHASE0_EVENT = "homi:phase0-freeze";

export const PHASE0_GUEST_PERSON = "guest";

export interface Phase0FreezeRecord {
  personKey: string;
  until: number;
  trippedAt: number;
  financialStress: boolean;
  selfHarm: boolean;
  signalIds: Phase0SignalId[];
}

export interface Phase0LedgerEvent {
  id: Phase0SignalId;
  category: Phase0Category;
  at: number;
  financialStress?: boolean;
  selfHarm?: boolean;
}

interface Phase0Ledger {
  personKey: string;
  events: Phase0LedgerEvent[];
}

export type Phase0Surface = "pending" | "frozen" | "open";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function readJson<T>(key: string): T | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — freeze still applies in-memory for this turn
    // via the returned record; next load may miss it.
  }
}

function emitPhase0Event(): void {
  if (!canUseStorage()) return;
  try {
    window.dispatchEvent(new Event(PHASE0_EVENT));
  } catch {
    // Ignore.
  }
}

export function rememberPhase0Person(personKey: string): void {
  writeJson(PHASE0_PERSON_KEY, personKey);
}

export function loadKnownPhase0Person(): string | null {
  const raw = readJson<unknown>(PHASE0_PERSON_KEY);
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export function personKeyForUserId(userId: string | null | undefined): string {
  return userId ? `user:${userId}` : PHASE0_GUEST_PERSON;
}

export function loadPhase0Freeze(): Phase0FreezeRecord | null {
  const record = readJson<Phase0FreezeRecord>(PHASE0_FREEZE_KEY);
  if (!record || typeof record.until !== "number" || typeof record.personKey !== "string") {
    return null;
  }
  return record;
}

export function isPhase0FreezeActive(
  record: Phase0FreezeRecord | null,
  nowMs = Date.now(),
): record is Phase0FreezeRecord {
  return Boolean(record && record.until > nowMs);
}

export function freezeMatchesPerson(
  record: Phase0FreezeRecord | null,
  personKey: string | null,
): boolean {
  if (!record) return false;
  if (!personKey) return true;
  return record.personKey === personKey;
}

export function isFrozenForPerson(
  personKey: string | null,
  nowMs = Date.now(),
): boolean {
  const record = loadPhase0Freeze();
  return isPhase0FreezeActive(record, nowMs) && freezeMatchesPerson(record, personKey);
}

export function selectPhase0Surface(
  personKey: string | null,
  resolvedPerson: boolean,
  nowMs = Date.now(),
): Phase0Surface {
  const record = loadPhase0Freeze();
  if (!isPhase0FreezeActive(record, nowMs)) return resolvedPerson ? "open" : "pending";
  if (!resolvedPerson) return "frozen";
  return freezeMatchesPerson(record, personKey) ? "frozen" : "open";
}

export function writePhase0Freeze(record: Phase0FreezeRecord): void {
  writeJson(PHASE0_FREEZE_KEY, record);
  if (canUseStorage()) {
    try {
      window.sessionStorage.setItem(PHASE0_JUST_TRIPPED_KEY, "1");
    } catch {
      // Ignore.
    }
  }
  emitPhase0Event();
}

export function markPhase0FreezeSeen(): void {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.removeItem(PHASE0_JUST_TRIPPED_KEY);
  } catch {
    // Ignore.
  }
}

export function phase0FreezeMode(): "trip" | "return" {
  if (!canUseStorage()) return "return";
  try {
    return window.sessionStorage.getItem(PHASE0_JUST_TRIPPED_KEY) === "1" ? "trip" : "return";
  } catch {
    return "return";
  }
}

export function clearPhase0Freeze(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(PHASE0_FREEZE_KEY);
    window.sessionStorage.removeItem(PHASE0_JUST_TRIPPED_KEY);
  } catch {
    // Ignore.
  }
  emitPhase0Event();
}

function loadLedger(personKey: string, nowMs: number): Phase0Ledger {
  const raw = readJson<Phase0Ledger>(PHASE0_LEDGER_KEY);
  if (!raw || raw.personKey !== personKey || !Array.isArray(raw.events)) {
    return { personKey, events: [] };
  }
  return {
    personKey,
    events: raw.events.filter((event) => event && nowMs - event.at < PHASE0_FREEZE_MS),
  };
}

function saveLedger(ledger: Phase0Ledger): void {
  writeJson(PHASE0_LEDGER_KEY, ledger);
}

export function ingestPhase0Observation(input: {
  personKey: string;
  texts?: readonly string[];
  named?: readonly Phase0NamedObservation[];
  selfHarm?: boolean;
  nowMs?: number;
}): Phase0Evaluation & { record: Phase0FreezeRecord | null } {
  const nowMs = input.nowMs ?? Date.now();
  rememberPhase0Person(input.personKey);

  const existing = loadPhase0Freeze();
  if (isPhase0FreezeActive(existing, nowMs) && freezeMatchesPerson(existing, input.personKey)) {
    return {
      frozen: true,
      signalIds: existing.signalIds,
      categories: [...new Set(existing.signalIds.map((id) => PHASE0_SIGNAL_CATEGORY[id]))],
      financialStress: existing.financialStress,
      selfHarm: existing.selfHarm,
      record: existing,
    };
  }

  const ledger = loadLedger(input.personKey, nowMs);
  const fresh = evaluatePhase0({
    texts: input.texts,
    named: input.named,
    selfHarm: input.selfHarm,
  });

  for (const id of fresh.signalIds) {
    if (ledger.events.some((event) => event.id === id)) continue;
    ledger.events.push({
      id,
      category: PHASE0_SIGNAL_CATEGORY[id],
      at: nowMs,
      financialStress: fresh.financialStress,
      selfHarm: fresh.selfHarm,
    });
  }
  saveLedger(ledger);

  const combined = evaluatePhase0({
    named: ledger.events.map((event) => ({
      id: event.id,
      financialStress: event.financialStress,
      selfHarm: event.selfHarm,
    })),
  });
  const financialStress = combined.financialStress || fresh.financialStress;
  const selfHarm = combined.selfHarm || fresh.selfHarm;

  if (!combined.frozen) {
    return { ...combined, financialStress, selfHarm, record: null };
  }

  const record: Phase0FreezeRecord = {
    personKey: input.personKey,
    until: freezeUntilMs(nowMs),
    trippedAt: nowMs,
    financialStress,
    selfHarm,
    signalIds: combined.signalIds,
  };
  writePhase0Freeze(record);
  return { ...combined, financialStress, selfHarm, record };
}

/** Law: abandonment and restart loops (2+ in 24h). The 2 is in the canon. */
export function recordAssessmentRestartLoop(personKey: string, nowMs = Date.now()): boolean {
  const raw = readJson<{ personKey: string; at: number[] }>(PHASE0_RESTART_KEY);
  const prior = raw && raw.personKey === personKey ? raw.at : [];
  const at = [...prior.filter((stamp) => nowMs - stamp < PHASE0_FREEZE_MS), nowMs];
  writeJson(PHASE0_RESTART_KEY, { personKey, at });
  if (at.length < 2) return false;
  ingestPhase0Observation({
    personKey,
    named: [{ id: "abandonment_restart_loop" }],
    nowMs,
  });
  return true;
}

export function recordNamedPhase0Signal(
  personKey: string,
  id: Phase0SignalId,
  nowMs = Date.now(),
): Phase0Evaluation & { record: Phase0FreezeRecord | null } {
  return ingestPhase0Observation({ personKey, named: [{ id }], nowMs });
}

export function clearPartialAssessmentInputs(): void {
  clearDraft();
  clearShadowDraft();
}
