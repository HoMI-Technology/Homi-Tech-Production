/**
 * Pure resolver for choosing which stored assessment result to DISPLAY on
 * /results and /plan: the local (localStorage) copy or the latest remote
 * (DB) copy for signed-in users. Never recomputes score/verdict — only
 * compares timestamps of two already-computed results.
 */

import type { StoredAssessment } from "./storage";

/**
 * Picks the result with the newer `completedAt` timestamp.
 *
 * - Local wins on a tie, or when remote is null.
 * - Remote wins when local is null, or when remote is strictly newer.
 */
export function pickResult(
  local: StoredAssessment | null,
  remote: StoredAssessment | null,
): StoredAssessment | null {
  if (!local) return remote;
  if (!remote) return local;

  const localTime = new Date(local.completedAt).getTime();
  const remoteTime = new Date(remote.completedAt).getTime();

  return remoteTime > localTime ? remote : local;
}
