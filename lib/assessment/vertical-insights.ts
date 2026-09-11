import "server-only";

/**
 * Compose engine output with ADR-002 display copy. Server-only because it
 * calls insight generators. Do not import from client modules.
 */

import { generateKeyInsight, generateNextSteps } from "@/lib/scoring/insights";
import type { AssessmentResult } from "@/lib/scoring/public";
import {
  applyHardStopCopy,
  hardStopNextStep,
  isHardStopCode,
} from "@/lib/assessment/hard-stop-copy";
import type { DecisionType } from "@/lib/assessment/types";

export function withVerticalHardStopDisplay(
  result: AssessmentResult,
  decisionType: DecisionType | string = "home_buying",
): {
  result: AssessmentResult;
  keyInsight: string;
  nextSteps: string[];
} {
  const hardStops = applyHardStopCopy(result.hardStops, decisionType);
  const displayed: AssessmentResult = { ...result, hardStops };
  const stopSteps = hardStops
    .filter((s) => isHardStopCode(s.code))
    .map((s) => hardStopNextStep(s.code, decisionType));
  const rest = generateNextSteps({ ...result, hardStops: [] });
  return {
    result: displayed,
    keyInsight: generateKeyInsight(displayed),
    nextSteps: [...stopSteps, ...rest].slice(0, 5),
  };
}
