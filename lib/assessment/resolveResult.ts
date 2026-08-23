/**
 * Pure resolver for choosing which stored assessment result to DISPLAY on
 * /results and /plan: the local (localStorage) copy or the latest remote
 * (DB) copy for signed-in users. Never recomputes score/verdict — only
 * compares timestamps of two already-computed results.
 */

import { isScoreShapedShadow, type StoredAssessment } from "./storage";

/**
 * Leftover kind:"shadow" payloads are not a Decision Readiness Score. Drop them before
 * /results, /plan, or any other reader can paint a verdict from them.
 */
export function discardScoreShapedShadow(
  stored: StoredAssessment | null,
): StoredAssessment | null {
  return isScoreShapedShadow(stored) ? null : stored;
}

/**
 * Picks the result with the newer `completedAt` timestamp.
 *
 * - Local wins on a tie, or when remote is null.
 * - Remote wins when local is null, or when remote is strictly newer.
 * - kind:"shadow" is discarded on both sides (Packet B).
 */
export function pickResult(
  local: StoredAssessment | null,
  remote: StoredAssessment | null,
): StoredAssessment | null {
  local = discardScoreShapedShadow(local);
  remote = discardScoreShapedShadow(remote);
  if (!local) return remote;
  if (!remote) return local;

  const localTime = new Date(local.completedAt).getTime();
  const remoteTime = new Date(remote.completedAt).getTime();

  return remoteTime > localTime ? remote : local;
}
