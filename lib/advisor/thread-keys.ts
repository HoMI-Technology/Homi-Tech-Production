/**
 * The Companion's local (anonymous/offline) thread storage keys — shared so
 * the widget, the full-page chat, and the "what HōMI remembers" panel can
 * never drift on where threads live. Server-side memory is lib/advisor/memory.
 */

/** Floating widget thread (sessionStorage). */
export const WIDGET_THREAD_KEY = "homi:companion-thread";

/** Full-page /advisor chat thread (localStorage). */
export const CHAT_THREAD_KEY = "homi:advisor-thread";

/** Clears both local thread copies. SSR-safe; storage failures are ignored. */
export function clearLocalThreads(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(WIDGET_THREAD_KEY);
  } catch {
    // Ignore — best-effort cleanup.
  }
  try {
    window.localStorage.removeItem(CHAT_THREAD_KEY);
  } catch {
    // Ignore — best-effort cleanup.
  }
}
