/**
 * Gate 6 outcome taxonomy. Stored on outcome_surveys.outcome only.
 * Saving an answer never writes assessments.score / verdict / hard_stops.
 */

export const OUTCOME_TAXONOMY = [
  "moved",
  "waited",
  "lender_blocked",
  "not_okay",
  "no_answer",
] as const;

export type OutcomeTaxonomy = (typeof OUTCOME_TAXONOMY)[number];

export const OUTCOME_TAXONOMY_LABELS: Record<OutcomeTaxonomy, string> = {
  moved: "Moved",
  waited: "Waited",
  lender_blocked: "Lender blocked",
  not_okay: "Not okay",
  no_answer: "Skip for now",
};

export function isOutcomeTaxonomy(value: string): value is OutcomeTaxonomy {
  return (OUTCOME_TAXONOMY as readonly string[]).includes(value);
}

/** Payload written to outcome_surveys. Never includes score or verdict. */
export function outcomeSurveyAnswerPayload(
  outcome: OutcomeTaxonomy,
  notes: string,
  completedAt: string,
): { outcome: OutcomeTaxonomy; notes: string | null; completed_at: string } {
  return {
    outcome,
    notes: notes.trim() || null,
    completed_at: completedAt,
  };
}
