/**
 * Client-side draft persistence for the in-progress full assessment flow.
 * Snapshots the form + step index so a refresh, back/forward navigation, or
 * a background tab getting evicted doesn't lose the user's answers.
 * SSR-safe (typeof window guards), try/catch guarded, JSON-safe, and
 * versioned — a schema change to FullAssessmentForm cleanly invalidates any
 * older draft instead of restoring it partially or crashing.
 */

import type { FullAssessmentForm } from "@/lib/assessment/types";

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
}

interface DraftEnvelope extends AssessmentDraft {
  version: number;
  updatedAt: string;
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
 */
export function loadDraft(): AssessmentDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftEnvelope> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== DRAFT_VERSION) return null;
    if (!parsed.form || typeof parsed.index !== "number") return null;
    return { form: parsed.form, index: parsed.index };
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
