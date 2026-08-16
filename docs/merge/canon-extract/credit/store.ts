/**
 * Credit overview — shared localStorage-backed state, extracted from the
 * /credit page so the Companion's context spine can read it under the same
 * honesty rules as the finance store: placeholder defaults are never
 * presented as the user's numbers, and every read carries freshness.
 * SSR-safe throughout.
 */

const STORAGE_KEY = "homi:credit";
const SAVED_AT_KEY = "homi:credit:saved-at";

export interface CreditState {
  score: number;
  utilization: number;
  onTimeStreakMonths: number;
}

export const DEFAULT_CREDIT_STATE: CreditState = {
  score: 680,
  utilization: 35,
  onTimeStreakMonths: 12,
};

/** The scoring canon's protective red line (BUILD-BRIEF, frozen). */
export const CREDIT_HARD_STOP = 620;

/**
 * Whether the user has actually saved credit data — the defaults-leak gate.
 * Context builders must check this before quoting numbers as "yours".
 */
export function hasSavedCreditState(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Loads credit state merged over defaults. SSR-safe. */
export function loadCreditState(): CreditState {
  if (typeof window === "undefined") return DEFAULT_CREDIT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CREDIT_STATE;
    return { ...DEFAULT_CREDIT_STATE, ...(JSON.parse(raw) as Partial<CreditState>) };
  } catch {
    return DEFAULT_CREDIT_STATE;
  }
}

/** Persists credit state and stamps the save time. SSR-safe no-op. */
export function saveCreditState(state: CreditState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.localStorage.setItem(SAVED_AT_KEY, new Date().toISOString());
  } catch {
    // Storage unavailable — session-only state still works.
  }
}

/** ISO timestamp of the last save; null when unsaved or pre-feature. */
export function creditSavedAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SAVED_AT_KEY);
  } catch {
    return null;
  }
}
