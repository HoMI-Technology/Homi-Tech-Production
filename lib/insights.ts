/**
 * Planner insights barrel — production generators via ScoreResult adapter.
 */

import {
  generateKeyInsight as prodKeyInsight,
  generateNextSteps as prodNextSteps,
} from "@/lib/scoring/insights";
import type { ScoreResult } from "@/lib/score";
import { assessmentFromScore } from "@/lib/path";

export interface NextStepsOptions {
  singleRedistribution?: boolean;
}

export function generateKeyInsight(result: ScoreResult): string {
  return prodKeyInsight(assessmentFromScore(result));
}

export function generateNextSteps(
  result: ScoreResult,
  opts?: NextStepsOptions,
): string[] {
  return prodNextSteps(
    assessmentFromScore(result, {
      singleRedistribution: opts?.singleRedistribution,
    }),
  );
}
