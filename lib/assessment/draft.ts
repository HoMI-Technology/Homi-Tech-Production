/**
 * Client-side draft persistence for the bank-driven full assessment flow.
 * Snapshots decision type, per-question responses, conflict fields, and step
 * index so refresh / tab eviction does not lose progress.
 */

import type { DecisionType } from "@/lib/assessment/types";
import type { ResponseValue } from "@/lib/questions/bank";
import type { ConflictResponses } from "@/lib/questions/to-inputs";

export const DRAFT_KEY = "homi:assessment-draft";

/** Bump when the draft envelope shape changes. */
export const DRAFT_VERSION = 2;

export interface AssessmentDraft {
  decisionType: DecisionType;
  responses: Record<string, ResponseValue>;
  conflict: ConflictResponses;
  index: number;
  updatedAt?: string;
}

interface DraftEnvelope {
  version: number;
  decisionType: DecisionType;
  responses: Record<string, ResponseValue>;
  conflict: ConflictResponses;
  index: number;
  updatedAt: string;
}

const EMPTY_CONFLICT: ConflictResponses = {
  referralSource: null,
  deadlineOrigin: null,
};

export function clampDraftIndex(index: number, maxIndexInclusive: number): number {
  if (!Number.isFinite(index)) return 0;
  const max = Math.max(0, maxIndexInclusive);
  return Math.min(Math.max(0, Math.floor(index)), max);
}

export function draftLooksStarted(draft: Pick<AssessmentDraft, "responses" | "conflict" | "index">): boolean {
  if (draft.index > 0) return true;
  if (draft.conflict.referralSource || draft.conflict.deadlineOrigin) return true;
  return Object.keys(draft.responses).length > 0;
}

export function saveDraft(draft: AssessmentDraft): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: DraftEnvelope = {
      version: DRAFT_VERSION,
      decisionType: draft.decisionType,
      responses: draft.responses,
      conflict: draft.conflict,
      index: draft.index,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(envelope));
  } catch {
    // Storage full or disabled — not fatal.
  }
}

export function loadDraft(maxStepIndex = 64): AssessmentDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftEnvelope> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== DRAFT_VERSION) return null;
    if (!parsed.decisionType || typeof parsed.index !== "number") return null;

    const draft: AssessmentDraft = {
      decisionType: parsed.decisionType,
      responses: parsed.responses ?? {},
      conflict: parsed.conflict ?? EMPTY_CONFLICT,
      index: clampDraftIndex(parsed.index, maxStepIndex),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
    };

    if (!draftLooksStarted(draft)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore.
  }
}
