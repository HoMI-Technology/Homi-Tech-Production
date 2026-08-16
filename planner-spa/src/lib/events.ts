/* ------------------------------------------------------------------ */
/* Local event log (M10) — pure util, no UI.                           */
/* Appends to `homi-events` in localStorage, capped at 500 entries     */
/* (oldest dropped first). Integration instruments the calls.          */
/* ------------------------------------------------------------------ */

export const EVENTS_STORAGE_KEY = 'homi-events'

/** Hard cap — oldest entries are dropped first. */
export const EVENTS_CAP = 500

export type HomiEvent = {
  /** ISO timestamp */
  at: string
  type: string
  meta?: Record<string, unknown>
}

function readEvents(): HomiEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(EVENTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as HomiEvent[]) : []
  } catch {
    return []
  }
}

function writeEvents(events: HomiEvent[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events))
  } catch {
    /* storage unavailable — event is dropped, never throws */
  }
}

/** Append an event; keeps the newest EVENTS_CAP entries (drops oldest). */
export function logEvent(type: string, meta?: Record<string, unknown>): void {
  const events = readEvents()
  events.push({ at: new Date().toISOString(), type, ...(meta ? { meta } : {}) })
  writeEvents(events.slice(-EVENTS_CAP))
}

/** All logged events, oldest → newest. */
export function getEvents(): HomiEvent[] {
  return readEvents()
}

/** Remove the event log from this browser. */
export function clearEvents(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(EVENTS_STORAGE_KEY)
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/** The full log as a pretty-printed JSON string. */
export function eventsToJson(): string {
  return JSON.stringify(readEvents(), null, 2)
}
