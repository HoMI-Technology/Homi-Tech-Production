/**
 * Maps a DB `assessments` row (server-authoritative, produced by
 * app/api/assessments POST) to the local `StoredAssessment` shape so
 * /results and /plan can render a signed-in user's latest DB result the
 * same way they render a local result. Never recomputes score/verdict —
 * only reshapes already-computed, already-persisted values.
 */

import type {
  AssessmentInputs,
  FinancialBreakdown,
  EmotionalBreakdown,
  TimingBreakdown,
  HardStopReason,
} from "@/lib/scoring";
import type { AssessmentRow } from "@/types/database";
import type { StoredAssessment } from "./storage";
import { DECISION_TYPE_LABELS, type DecisionType } from "@/lib/assessment/types";

function asDecisionType(value: string | null | undefined): DecisionType | undefined {
  if (!value) return undefined;
  return value in DECISION_TYPE_LABELS ? (value as DecisionType) : undefined;
}

/**
 * Converts an `assessments` table row into a `StoredAssessment`.
 * Returns null when the row is missing fields required to render a result
 * (e.g. an in-progress/expired row with no computed score yet).
 *
 * Note: `warnings` are not persisted to the DB (only score, verdict,
 * sub-scores, and hard-stops are) so remote-mapped results always carry an
 * empty warnings array. This is a cosmetic-only gap — warnings never affect
 * score or verdict.
 */
export function mapAssessmentRowToStored(row: AssessmentRow): StoredAssessment | null {
  const {
    overall_score,
    verdict,
    sub_scores,
    inputs,
    hard_stops,
    completed_at,
    created_at,
    is_shadow,
    id,
    insights,
    decision_type,
  } = row;

  if (overall_score === null || verdict === null || !sub_scores || !inputs) return null;

  const subScores = sub_scores as {
    financial?: FinancialBreakdown;
    emotional?: EmotionalBreakdown;
    timing?: TimingBreakdown;
  };
  if (!subScores.financial || !subScores.emotional || !subScores.timing) return null;

  const rawInsights = insights as { keyInsight?: unknown; nextSteps?: unknown } | null;
  const mappedInsights =
    rawInsights &&
    typeof rawInsights.keyInsight === "string" &&
    Array.isArray(rawInsights.nextSteps)
      ? {
          keyInsight: rawInsights.keyInsight,
          nextSteps: rawInsights.nextSteps.filter((s): s is string => typeof s === "string"),
        }
      : undefined;

  const decisionType = asDecisionType(decision_type);

  return {
    inputs: inputs as unknown as AssessmentInputs,
    result: {
      score: overall_score,
      verdict,
      financial: subScores.financial,
      emotional: subScores.emotional,
      timing: subScores.timing,
      warnings: [],
      hardStops: (hard_stops as unknown as HardStopReason[] | null) ?? [],
    },
    completedAt: completed_at ?? created_at,
    kind: is_shadow ? "shadow" : "full",
    serverId: id,
    ...(decisionType ? { decisionType } : {}),
    ...(mappedInsights ? { insights: mappedInsights } : {}),
  };
}
