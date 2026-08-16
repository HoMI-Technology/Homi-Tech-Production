/**
 * Full dual assessment scoring for two people.
 * Combines two AssessmentResults into a household readiness view.
 * Scorer remains SSOT per person; this layer only composes.
 */

import {
  scoreToVerdict,
  type AssessmentResult,
  type HardStopReason,
  type Verdict,
} from "@/lib/scoring";
import type { ScoreResult } from "@/lib/score";
import { assessmentFromScore } from "@/lib/path";

export interface DualMemberScore {
  label: string;
  score: number;
  verdict: Verdict;
  hardStops: HardStopReason[];
}

export interface DualHouseholdScore {
  memberA: DualMemberScore;
  memberB: DualMemberScore;
  /** Min of the two scores — household only as ready as the weaker pillar set. */
  jointScore: number;
  jointVerdict: Verdict;
  /** Union of hard-stops (deduped by code). */
  jointHardStops: HardStopReason[];
  /** Absolute score gap. */
  scoreGap: number;
  verdictAligned: boolean;
  summary: string;
  disclaimer: string;
}

export const DUAL_SCORE_DISCLAIMER =
  "Household readiness is educational only. Joint score is the weaker member's " +
  "composite — not an average that hides a hard-stop. Not a commitment to lend.";

/** Accept production AssessmentResult or planner ScoreResult (adapter payload). */
type DualInputResult = AssessmentResult | ScoreResult;

function toAssessment(result: DualInputResult): AssessmentResult {
  if (
    result &&
    typeof result === "object" &&
    "assessment" in result &&
    result.assessment
  ) {
    return result.assessment;
  }
  if (
    result &&
    typeof result === "object" &&
    "financial" in result &&
    "emotional" in result &&
    "timing" in result &&
    !("pillars" in result)
  ) {
    return result as AssessmentResult;
  }
  return assessmentFromScore(result as ScoreResult);
}

/**
 * Combine two scored assessments into household readiness.
 * Joint score = min(A, B). Joint hard-stops = union.
 */
export function computeDualHouseholdScore(
  a: { label: string; result: DualInputResult },
  b: { label: string; result: DualInputResult },
): DualHouseholdScore {
  const aResult = toAssessment(a.result);
  const bResult = toAssessment(b.result);

  const memberA: DualMemberScore = {
    label: a.label,
    score: aResult.score,
    verdict: aResult.verdict,
    hardStops: aResult.hardStops,
  };
  const memberB: DualMemberScore = {
    label: b.label,
    score: bResult.score,
    verdict: bResult.verdict,
    hardStops: bResult.hardStops,
  };

  const jointScore = Math.min(aResult.score, bResult.score);
  const hardMap = new Map<string, HardStopReason>();
  for (const h of [...aResult.hardStops, ...bResult.hardStops]) {
    if (!hardMap.has(h.code)) hardMap.set(h.code, h);
  }
  const jointHardStops = Array.from(hardMap.values());
  // Hard-stops or either member NOT_YET force joint NOT_YET
  const eitherNotYet =
    aResult.verdict === "NOT_YET" || bResult.verdict === "NOT_YET";
  const jointVerdict: Verdict =
    jointHardStops.length > 0 || eitherNotYet
      ? "NOT_YET"
      : scoreToVerdict(jointScore);

  const scoreGap = Math.abs(aResult.score - bResult.score);
  const verdictAligned = aResult.verdict === bResult.verdict;

  let summary: string;
  if (jointHardStops.length > 0) {
    summary =
      `Household DO NOT PROCEED — ${jointHardStops.length} protective hard-stop(s) ` +
      `across members. Clear gates before a joint move.`;
  } else if (!verdictAligned) {
    summary =
      `Verdicts differ (${a.label}: ${aResult.verdict}, ${b.label}: ${bResult.verdict}). ` +
      `Joint score ${jointScore} follows the weaker readiness.`;
  } else if (scoreGap >= 15) {
    summary =
      `Same verdict band but a ${scoreGap.toFixed(0)}-point gap — align timeline and funding before stretching.`;
  } else {
    summary = `Household readiness aligned around ${jointVerdict} (joint ${jointScore}).`;
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
  };
}
