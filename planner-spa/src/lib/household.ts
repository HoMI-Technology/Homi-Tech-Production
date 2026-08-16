/* ------------------------------------------------------------------ */
/* Canonical dual-household scoring — port of household/dual-score.ts  */
/* (GitHub HoMI-Technology/Homi-Tech-Production = source of truth),    */
/* adapted to our ScoreResult (lib/score.ts). Pure module — composes   */
/* two individual results; the per-person engine remains SSOT.         */
/* ------------------------------------------------------------------ */

import { deriveVerdict } from '@/lib/score'
import type { HardStopKey, ScoreResult, VerdictKey } from '@/lib/score'

export interface DualMemberScore {
  label: string
  score: number
  verdict: VerdictKey
  hardStops: HardStopKey[]
}

export interface DualHouseholdScore {
  memberA: DualMemberScore
  memberB: DualMemberScore
  /** Min of the two scores — household only as ready as the weaker pillar set. */
  jointScore: number
  jointVerdict: VerdictKey
  /** Union of hard-stops (deduped by code). */
  jointHardStops: HardStopKey[]
  /** Absolute score gap. */
  scoreGap: number
  verdictAligned: boolean
  summary: string
  disclaimer: string
}

export const DUAL_SCORE_DISCLAIMER =
  "Household readiness is educational only. Joint score is the weaker member's " +
  'composite — not an average that hides a hard-stop. Not a commitment to lend.'

/**
 * Combine two scored assessments into household readiness.
 * Joint score = min(A, B). Joint hard-stops = union.
 */
export function computeDualHouseholdScore(
  a: { label: string; result: ScoreResult },
  b: { label: string; result: ScoreResult },
): DualHouseholdScore {
  const memberA: DualMemberScore = {
    label: a.label,
    score: a.result.score,
    verdict: a.result.verdict,
    hardStops: a.result.hardStops,
  }
  const memberB: DualMemberScore = {
    label: b.label,
    score: b.result.score,
    verdict: b.result.verdict,
    hardStops: b.result.hardStops,
  }

  const jointScore = Math.min(a.result.score, b.result.score)
  const jointHardStops = Array.from(new Set([...a.result.hardStops, ...b.result.hardStops]))
  // Hard-stops or either member NOT_YET force joint NOT_YET
  const eitherNotYet = a.result.verdict === 'NOT_YET' || b.result.verdict === 'NOT_YET'
  const jointVerdict: VerdictKey =
    jointHardStops.length > 0 || eitherNotYet ? 'NOT_YET' : deriveVerdict(jointScore)

  const scoreGap = Math.abs(a.result.score - b.result.score)
  const verdictAligned = a.result.verdict === b.result.verdict

  let summary: string
  if (jointHardStops.length > 0) {
    summary =
      `Household DO NOT PROCEED — ${jointHardStops.length} protective hard-stop(s) ` +
      `across members. Clear gates before a joint move.`
  } else if (!verdictAligned) {
    summary =
      `Verdicts differ (${a.label}: ${a.result.verdict}, ${b.label}: ${b.result.verdict}). ` +
      `Joint score ${jointScore} follows the weaker readiness.`
  } else if (scoreGap >= 15) {
    summary =
      `Same verdict band but a ${scoreGap.toFixed(0)}-point gap — align timeline and funding before stretching.`
  } else {
    summary = `Household readiness aligned around ${jointVerdict} (joint ${jointScore}).`
  }

  return {
    memberA,
    memberB,
    jointScore,
    jointVerdict,
    jointHardStops,
    scoreGap,
    verdictAligned,
    summary,
    disclaimer: DUAL_SCORE_DISCLAIMER,
  }
}
