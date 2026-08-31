/**
 * Decision snapshot + checkpoint schedule for a completed verdict.
 * Answers never re-score. Weights stay frozen in lib/scoring.
 *
 * Storage:
 *   • assessments.insights.decisionSnapshot — immutable T0 copy
 *   • outcome_surveys kind=day30|day90|day365
 *   • outcome_surveys.outcome — Gate 6 taxonomy (see taxonomy.ts)
 */

import { SCORING_SCHEMA_ID } from "./evidence-version";

export const HOME_DECISION_TYPE = "home_buying";
export const DAY30_KIND = "day30" as const;
export const SURVEY_CHECKPOINTS = [
  { kind: "day30" as const, days: 30 },
  { kind: "day90" as const, days: 90 },
  { kind: "day365" as const, days: 365 },
];
export const DAY_MS = 24 * 60 * 60 * 1000;

export type SnapshotVerdict = "READY" | "ALMOST_THERE" | "BUILD_FIRST" | "NOT_YET";

export interface SnapshotProvenance {
  dti: string;
  downPayment: string;
  runway: string;
  credit: string;
  lookbackDays: number | null;
}

export interface SnapshotHardStop {
  code: string;
  message: string;
}

/** Frozen-at-persist copy. The due prompt reads this; it never writes it. */
export interface DecisionSnapshot {
  decision_id: string;
  score: number;
  verdict: SnapshotVerdict;
  hardStops: SnapshotHardStop[];
  provenance: SnapshotProvenance;
  self_reported_credit_band: string | null;
  timestamp: string;
  scoring_schema_id: string;
}

export function isHomeDecisionType(decisionType: string | null | undefined): boolean {
  return (decisionType ?? HOME_DECISION_TYPE) === HOME_DECISION_TYPE;
}

export function checkpointDueAt(completedAtIso: string, days: number): string {
  const completed = Date.parse(completedAtIso);
  if (Number.isNaN(completed)) {
    throw new Error("completed_at must be an ISO timestamp");
  }
  return new Date(completed + days * DAY_MS).toISOString();
}

export function day30DueAt(completedAtIso: string): string {
  return checkpointDueAt(completedAtIso, 30);
}

export function buildDecisionSnapshot(input: {
  decisionId: string;
  score: number;
  verdict: SnapshotVerdict;
  hardStops: SnapshotHardStop[];
  provenance: SnapshotProvenance;
  selfReportedCreditBand: string | null | undefined;
  timestamp: string;
}): DecisionSnapshot {
  return {
    decision_id: input.decisionId,
    score: input.score,
    verdict: input.verdict,
    hardStops: input.hardStops.map((stop) => ({
      code: stop.code,
      message: stop.message,
    })),
    provenance: {
      dti: input.provenance.dti,
      downPayment: input.provenance.downPayment,
      runway: input.provenance.runway,
      credit: input.provenance.credit,
      lookbackDays:
        typeof input.provenance.lookbackDays === "number" &&
        Number.isFinite(input.provenance.lookbackDays)
          ? input.provenance.lookbackDays
          : null,
    },
    self_reported_credit_band: input.selfReportedCreditBand ?? null,
    timestamp: input.timestamp,
    scoring_schema_id: SCORING_SCHEMA_ID,
  };
}

export function buildDay30SurveyRow(input: {
  userId: string;
  assessmentId: string;
  completedAt: string;
}): {
  user_id: string;
  assessment_id: string;
  kind: typeof DAY30_KIND;
  due_at: string;
} {
  return {
    user_id: input.userId,
    assessment_id: input.assessmentId,
    kind: DAY30_KIND,
    due_at: day30DueAt(input.completedAt),
  };
}

export function buildCheckpointSurveyRows(input: {
  userId: string;
  assessmentId: string;
  completedAt: string;
}): Array<{
  user_id: string;
  assessment_id: string;
  kind: "day30" | "day90" | "day365";
  due_at: string;
  contact_state: "eligible";
}> {
  return SURVEY_CHECKPOINTS.map(({ kind, days }) => ({
    user_id: input.userId,
    assessment_id: input.assessmentId,
    kind,
    due_at: checkpointDueAt(input.completedAt, days),
    contact_state: "eligible" as const,
  }));
}
