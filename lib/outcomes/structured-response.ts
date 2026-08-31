import { z } from "zod";
import { SURVEY_RESPONSE_SCHEMA_VERSION } from "./evidence-version";
import { OUTCOME_TAXONOMY, type OutcomeTaxonomy } from "./taxonomy";
import {
  DECISION_STATES,
  DIFFICULTY_BANDS,
  RESERVE_BANDS,
  YES_NO_UNKNOWN,
} from "./bands";

const optionalInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable().optional();

export const structuredOutcomeResponseSchema = z.object({
  outcome: z.enum(OUTCOME_TAXONOMY),
  notes: z.string().max(2000).nullable().optional().default(""),
  satisfaction: optionalInt(1, 5),
  financial_stress: optionalInt(1, 10),
  emergency_reserve_band: z.enum(RESERVE_BANDS).optional(),
  payment_difficulty: z.enum(DIFFICULTY_BANDS).optional(),
  unexpected_expense_resilience: z.enum(DIFFICULTY_BANDS).optional(),
  material_financial_disruption: z.enum(YES_NO_UNKNOWN).optional(),
  decision_regret: optionalInt(1, 5),
  decision_confidence: optionalInt(1, 10),
  would_make_same_decision_again: z.enum(YES_NO_UNKNOWN).optional(),
  priority_disruption: z.enum(YES_NO_UNKNOWN).optional(),
  decision_state: z.enum(DECISION_STATES).optional(),
});

export type StructuredOutcomeResponse = z.infer<typeof structuredOutcomeResponseSchema>;

export function outcomeSurveyStructuredPayload(
  input: StructuredOutcomeResponse,
  completedAt: string,
): Record<string, unknown> {
  const notes = input.notes?.trim() || null;
  const declined = input.outcome === "no_answer";
  return {
    outcome: input.outcome as OutcomeTaxonomy,
    notes,
    completed_at: completedAt,
    satisfaction: input.satisfaction ?? null,
    financial_stress: input.financial_stress ?? null,
    emergency_reserve_band: input.emergency_reserve_band ?? null,
    payment_difficulty: input.payment_difficulty ?? null,
    unexpected_expense_resilience: input.unexpected_expense_resilience ?? null,
    material_financial_disruption: input.material_financial_disruption ?? null,
    decision_regret: input.decision_regret ?? null,
    decision_confidence: input.decision_confidence ?? null,
    would_make_same_decision_again: input.would_make_same_decision_again ?? null,
    priority_disruption: input.priority_disruption ?? null,
    decision_state: input.decision_state ?? null,
    response_schema_version: SURVEY_RESPONSE_SCHEMA_VERSION,
    contact_state: declined ? "declined" : "completed",
    declined_at: declined ? completedAt : null,
    started_at: completedAt,
  };
}
