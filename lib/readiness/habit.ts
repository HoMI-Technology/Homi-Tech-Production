/**
 * Path habit helpers — pure stage derivation + session-scoped once flags.
 * No network; safe for client islands.
 */

import type { ReadinessPath } from "./path";

export type PathHabitStage =
  | "no_path"
  | "path_pending_first"
  | "path_in_progress"
  | "path_complete"
  | "ready_optional";

export type PathHabitSurface =
  | "dashboard"
  | "results"
  | "path_page"
  | "finance"
  | "unknown";

/** Coarse stage for funnel dashboards — no free text. */
export function derivePathHabitStage(
  path: ReadinessPath | null | undefined,
): PathHabitStage {
  if (!path) return "no_path";
  if (path.mode === "ready_optional") return "ready_optional";
  const steps = path.steps ?? [];
  if (steps.length === 0) return "path_complete";
  const doneOrSkip = steps.filter(
    (s) => (s.status ?? "pending") === "done" || (s.status ?? "pending") === "skipped",
  ).length;
  if (doneOrSkip === 0) return "path_pending_first";
  if (doneOrSkip >= steps.length) return "path_complete";
  return "path_in_progress";
}

export function pathPendingStepCount(path: ReadinessPath | null | undefined): number {
  if (!path?.steps?.length) return 0;
  return path.steps.filter((s) => (s.status ?? "pending") === "pending").length;
}

/** True when path is older than `minDays` and still incomplete (return habit). */
export function isPathReturnVisit(
  path: ReadinessPath | null | undefined,
  minDays = 1,
  nowMs: number = Date.now(),
): boolean {
  if (!path || path.mode === "ready_optional") return false;
  const stage = derivePathHabitStage(path);
  if (stage === "path_complete" || stage === "no_path") return false;
  const created = Date.parse(path.createdAt);
  if (!Number.isFinite(created)) return false;
  return nowMs - created >= minDays * 86_400_000;
}

const SESSION_ONCE_KEY = "homi:path-habit:once";

/**
 * Fire-at-most-once per browser session for a named key.
 * Returns true if this call should emit analytics.
 */
export function pathHabitOncePerSession(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(SESSION_ONCE_KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!Array.isArray(list)) return true;
    if (list.includes(key)) return false;
    list.push(key);
    // Cap growth
    const next = list.length > 40 ? list.slice(-40) : list;
    sessionStorage.setItem(SESSION_ONCE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return true;
  }
}
