/* ------------------------------------------------------------------ */
/* Data portability (M0) — export & erase for every `homi-*` key.      */
/* Everything lives in this browser's localStorage; these are the      */
/* take-it-with-you / leave-no-trace primitives used by Trust.         */
/* ------------------------------------------------------------------ */

const HOMI_PREFIX = 'homi-'

function homiKeys(): string[] {
  if (typeof window === 'undefined') return []
  const keys: string[] = []
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith(HOMI_PREFIX)) keys.push(k)
    }
  } catch {
    /* storage unavailable */
  }
  return keys.sort()
}

export type HomiExport = {
  exportedAt: string
  app: 'HōMI Planner'
  data: Record<string, unknown>
}

/** Gather every `homi-*` localStorage key into one export object. */
export function collectHomiData(): HomiExport {
  const data: Record<string, unknown> = {}
  for (const key of homiKeys()) {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) continue
      try {
        data[key] = JSON.parse(raw)
      } catch {
        data[key] = raw // not JSON — keep the raw string, lose nothing
      }
    } catch {
      /* skip unreadable key */
    }
  }
  return { exportedAt: new Date().toISOString(), app: 'HōMI Planner', data }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Download the full export as `homi-data-YYYYMMDD.json`. */
export function downloadHomiExport(): void {
  if (typeof window === 'undefined') return
  const now = new Date()
  const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`
  const blob = new Blob([JSON.stringify(collectHomiData(), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `homi-data-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Remove every `homi-*` key from this browser. Caller reloads. */
export function eraseAllHomiData(): void {
  if (typeof window === 'undefined') return
  for (const key of homiKeys()) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* storage unavailable */
    }
  }
}
