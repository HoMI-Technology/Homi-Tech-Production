/**
 * The Companion's local (anonymous/offline) thread storage keys — shared so
 * the widget, the full-page chat, and the "what HōMI remembers" panel can
 * never drift on where threads live. Server-side memory is lib/advisor/memory.
 */

/** Floating widget thread (sessionStorage). */
export const WIDGET_THREAD_KEY = "homi:companion-thread";

/** Full-page /advisor chat thread (localStorage). */
export const CHAT_THREAD_KEY = "homi:advisor-thread";

/** LWW stamps (ms epoch) for the two local threads — lib/persistence.ts. */
export const WIDGET_THREAD_STAMP_KEY = "homi:companion-thread:updated-at";
export const CHAT_THREAD_STAMP_KEY = "homi:advisor-thread:updated-at";

/** Clears both local thread copies and their stamps. SSR-safe; storage failures are ignored. */
export function clearLocalThreads(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(WIDGET_THREAD_KEY);
    window.sessionStorage.removeItem(WIDGET_THREAD_STAMP_KEY);
  } catch {
    // Ignore — best-effort cleanup.
  }
  try {
    window.localStorage.removeItem(CHAT_THREAD_KEY);
    window.localStorage.removeItem(CHAT_THREAD_STAMP_KEY);
  } catch {
    // Ignore — best-effort cleanup.
  }
}
