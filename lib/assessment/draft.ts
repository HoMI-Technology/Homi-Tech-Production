/**
 * Client-side draft persistence for the in-progress full assessment flow.
 * Snapshots the form + step index so a refresh, back/forward navigation, or
 * a background tab getting evicted doesn't lose the user's answers.
 * SSR-safe (typeof window guards), try/catch guarded, JSON-safe, and
 * versioned — a schema change to FullAssessmentForm cleanly invalidates any
 * older draft instead of restoring it partially or crashing.
 */

import {
  INITIAL_FULL_FORM,
  type FullAssessmentForm,
} from "@/lib/assessment/types";

export const DRAFT_KEY = "homi:assessment-draft";

/**
 * Bump whenever FullAssessmentForm's shape changes in a way that would make
 * an older stored draft unsafe to restore as-is. A draft saved under a
 * different version is treated as absent rather than partially applied.
 */
export const DRAFT_VERSION = 1;

export interface AssessmentDraft {
  form: FullAssessmentForm;
  index: number;
  updatedAt?: string;
}

interface DraftEnvelope {
  version: number;
  form: FullAssessmentForm;
  index: number;
  updatedAt: string;
}

/** Merge a stored form onto INITIAL so missing keys never crash field steps. */
export function normalizeDraftForm(
  partial: Partial<FullAssessmentForm> | null | undefined,
): FullAssessmentForm {
  return { ...INITIAL_FULL_FORM, ...(partial ?? {}) };
}

/** Clamp step index into [0, maxIndexInclusive]. */
export function clampDraftIndex(index: number, maxIndexInclusive: number): number {
  if (!Number.isFinite(index)) return 0;
  const max = Math.max(0, maxIndexInclusive);
  return Math.min(Math.max(0, Math.floor(index)), max);
}

/** True when the draft has any non-default signal worth offering "Resume". */
export function draftLooksStarted(
  form: FullAssessmentForm,
  index: number,
): boolean {
  if (index > 0) return true;
  return Object.keys(INITIAL_FULL_FORM).some((key) => {
    const k = key as keyof FullAssessmentForm;
    return form[k] !== INITIAL_FULL_FORM[k];
  });
}

/** Saves the current form + step index as the resumable draft. No-op on the server or on failure. */
export function saveDraft(form: FullAssessmentForm, index: number): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: DraftEnvelope = {
      version: DRAFT_VERSION,
      form,
      index,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(envelope));
  } catch {
    // Storage full, disabled, or private mode — fail silently. Not fatal.
  }
}

/**
 * Loads the saved draft. Returns null on the server, absence, a version
 * mismatch (schema changed since the draft was saved), or any parse
 * failure — callers should treat null as "start fresh".
 *
 * @param maxStepIndex Inclusive max step (STEPS.length - 1). Defaults to a
 * safe large clamp when omitted; pass the real step count from the flow.
 */
export function loadDraft(maxStepIndex = 64): AssessmentDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftEnvelope> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== DRAFT_VERSION) return null;
    if (!parsed.form || typeof parsed.index !== "number") return null;

    const form = normalizeDraftForm(parsed.form);
    const index = clampDraftIndex(parsed.index, maxStepIndex);
    if (!draftLooksStarted(form, index)) return null;

    return {
      form,
      index,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
    };
  } catch {
    return null;
  }
}

/** Clears the saved draft. No-op on the server or on failure. */
export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore.
  }
}
