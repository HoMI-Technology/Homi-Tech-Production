/**
 * Gate 6 / Ticket 5 — decision snapshot + day30 row for a completed home
 * verdict. Answers never re-score. Scoring stays in lib/scoring (frozen).
 *
 * Storage (live schema, 2026-08-19): reuse existing columns.
 *   • assessments.insights.decisionSnapshot — snapshot the 30-day ping reads
 *   • outcome_surveys (kind=day30) — due_at = completed_at + 30 days
 *   • outcome_surveys.outcome — Gate 6 taxonomy (see taxonomy.ts)
 */

export const HOME_DECISION_TYPE = "home_buying";
export const DAY30_KIND = "day30" as const;
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
}

export function isHomeDecisionType(decisionType: string | null | undefined): boolean {
  return (decisionType ?? HOME_DECISION_TYPE) === HOME_DECISION_TYPE;
}

export function day30DueAt(completedAtIso: string): string {
  const completed = Date.parse(completedAtIso);
  if (Number.isNaN(completed)) {
    throw new Error("completed_at must be an ISO timestamp");
  }
  return new Date(completed + 30 * DAY_MS).toISOString();
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
