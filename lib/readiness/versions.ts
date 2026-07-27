/**
 * Path versioning — keep prior paths when regenerating.
 * Local history is capped; server stores current only (LWW).
 */

import type { ReadinessPath } from "./path";
import { normalizeReadinessPath } from "./path";

const HISTORY_KEY = "homi:readiness-path-history";
const MAX_VERSIONS = 10;

export interface PathVersionRecord {
  savedAt: string;
  path: ReadinessPath;
}

export function loadPathHistory(): PathVersionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PathVersionRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((r) => ({
        savedAt: r.savedAt,
        path: normalizeReadinessPath(r.path) as ReadinessPath,
      }))
      .filter((r) => r.path != null);
  } catch {
    return [];
  }
}

function saveHistory(records: PathVersionRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(records.slice(0, MAX_VERSIONS)),
    );
  } catch {
    /* quota */
  }
}

/** Push current path onto history before overwriting with a new generation. */
export function archivePathVersion(path: ReadinessPath, now = new Date()): void {
  const prev = loadPathHistory();
  const next: PathVersionRecord[] = [
    { savedAt: now.toISOString(), path },
    ...prev.filter((r) => r.path.id !== path.id),
  ].slice(0, MAX_VERSIONS);
  saveHistory(next);
}

export function clearPathHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}
