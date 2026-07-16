"use client";

import { ENTRANCE_KEY } from "./entrance-shared";

/**
 * Session-once gate for the dashboard entrance choreography. Premium is
 * delightful the first time and *fast* the hundredth: the full sequence plays
 * once per browser session; every client-side return renders instantly.
 *
 * The inline boot script (entrance-shared.ts) reads the same key pre-paint so
 * repeat visits never flash hidden content; these helpers are the hydrated
 * side of that contract.
 */

export function entranceShouldPlay(): boolean {
  try {
    if (window.sessionStorage.getItem(ENTRANCE_KEY) === "1") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return true;
  } catch {
    // Storage blocked → never gamble on replaying theatre; render instantly.
    return false;
  }
}

export function markEntrancePlayed(): void {
  try {
    window.sessionStorage.setItem(ENTRANCE_KEY, "1");
  } catch {
    // Best effort — worst case the entrance replays next visit.
  }
}
