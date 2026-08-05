/**
 * Outcome channel for the assessment background save (Plans.md F.12).
 *
 * Both assessment flows POST /api/assessments fire-and-forget and navigate to
 * /results immediately (local-first by design). Before this module, every
 * non-OK outcome — 402 rescoring_locked, 400, 500, network loss — was
 * silently swallowed and a signed-in user never learned their result lived
 * on this device only. The flows record how the save resolved here;
 * /results subscribes and surfaces the honest state.
 *
 * SSR-safe and storage-failure-safe, same conventions as storage.ts/draft.ts.
 * Same-tab reactivity uses a CustomEvent because the `storage` event only
 * fires in OTHER tabs.
 */

export const SAVE_STATUS_KEY = "homi:assessment-save-status";
const SAVE_STATUS_EVENT = "homi:assessment-save-status";

export type SaveOutcome = "pending" | "saved" | "unauthenticated" | "locked" | "failed";

const OUTCOMES: readonly SaveOutcome[] = ["pending", "saved", "unauthenticated", "locked", "failed"];

export interface AssessmentSaveStatus {
  outcome: SaveOutcome;
  at: string;
}

/** Maps the POST /api/assessments response status to a save outcome. */
export function statusFromResponse(status: number): SaveOutcome {
  if (status >= 200 && status < 300) return "saved";
  if (status === 401) return "unauthenticated"; // anonymous — local-only is expected
  if (status === 402) return "locked"; // free-tier rescoring_locked
  return "failed";
}

export function recordSaveStatus(outcome: SaveOutcome): void {
  if (typeof window === "undefined") return;
  try {
    const status: AssessmentSaveStatus = { outcome, at: new Date().toISOString() };
    window.localStorage.setItem(SAVE_STATUS_KEY, JSON.stringify(status));
    window.dispatchEvent(new CustomEvent(SAVE_STATUS_EVENT));
  } catch {
    // Storage full or disabled — the banner just won't show. Not fatal.
  }
}

export function loadSaveStatus(): AssessmentSaveStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVE_STATUS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AssessmentSaveStatus> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (!OUTCOMES.includes(parsed.outcome as SaveOutcome)) return null;
    return { outcome: parsed.outcome as SaveOutcome, at: typeof parsed.at === "string" ? parsed.at : "" };
  } catch {
    return null;
  }
}

export function clearSaveStatus(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SAVE_STATUS_KEY);
    window.dispatchEvent(new CustomEvent(SAVE_STATUS_EVENT));
  } catch {
    // Ignore.
  }
}

/** Same-tab subscription; returns an unsubscribe. Fires with the fresh status on every record/clear. */
export function subscribeSaveStatus(cb: (status: AssessmentSaveStatus | null) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb(loadSaveStatus());
  window.addEventListener(SAVE_STATUS_EVENT, handler);
  return () => window.removeEventListener(SAVE_STATUS_EVENT, handler);
}
