/**
 * T0 baseline from observed assessment fields only.
 * Never infers subjective stress from DTI, score, or verdict.
 */

import { BASELINE_SCHEMA_VERSION, SCORING_SCHEMA_ID } from "./evidence-version";
import {
  reserveBandFromMonths,
  type DecisionIntent,
  type DifficultyBand,
  type ReserveBand,
} from "./bands";

export interface ObservedAssessmentFields {
  emergencyFundMonths?: number | null;
  confidenceLevel?: number | null;
}

export interface OutcomeBaseline {
  schema_version: string;
  scoring_schema_id: string;
  financial_stress: number | null;
  emergency_reserve_band: ReserveBand;
  cash_margin_band: ReserveBand;
  payment_difficulty: DifficultyBand;
  unexpected_expense_resilience: DifficultyBand;
  decision_confidence: number | null;
  decision_intent: DecisionIntent;
}

function sliderOrNull(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < 1 || value > 10) return null;
  return Math.round(value);
}

export function buildOutcomeBaseline(fields: ObservedAssessmentFields): OutcomeBaseline {
  return {
    schema_version: BASELINE_SCHEMA_VERSION,
    scoring_schema_id: SCORING_SCHEMA_ID,
    financial_stress: null,
    emergency_reserve_band: reserveBandFromMonths(fields.emergencyFundMonths),
    cash_margin_band: "unknown",
    payment_difficulty: "unknown",
    unexpected_expense_resilience: "unknown",
    decision_confidence: sliderOrNull(fields.confidenceLevel),
    decision_intent: "unknown",
  };
}

export function baselineInsertRow(input: {
  assessmentId: string;
  userId: string;
  capturedAt: string;
  fields: ObservedAssessmentFields;
}): Record<string, unknown> {
  const baseline = buildOutcomeBaseline(input.fields);
  return {
    assessment_id: input.assessmentId,
    user_id: input.userId,
    captured_at: input.capturedAt,
    ...baseline,
  };
}
