import type { VerdictType } from "@/types/database";
import type { ContactState } from "./bands";

export interface SurveyFunnelRow {
  verdict: VerdictType | null;
  kind: "day30" | "day90" | "day365";
  contact_state: ContactState;
  completed_at: string | null;
  scoring_schema_id?: string | null;
  decision_type?: string | null;
}

export interface FunnelCounts {
  eligible: number;
  contact_attempted: number;
  delivered: number;
  started: number;
  completed: number;
  declined: number;
  unsubscribed: number;
  unreachable: number;
}

export interface RateReport {
  completed: number;
  eligible: number;
  completion_rate: number | null;
}

function reached(state: ContactState, target: ContactState): boolean {
  const order: ContactState[] = [
    "eligible",
    "contact_attempted",
    "delivered",
    "started",
    "completed",
  ];
  if (state === target) return true;
  if (
    target !== "declined" &&
    target !== "unsubscribed" &&
    target !== "unreachable" &&
    state === "completed"
  ) {
    const ti = order.indexOf(target);
    return ti >= 0;
  }
  return false;
}

export function funnelCounts(rows: SurveyFunnelRow[]): FunnelCounts {
  const counts: FunnelCounts = {
    eligible: rows.length,
    contact_attempted: 0,
    delivered: 0,
    started: 0,
    completed: 0,
    declined: 0,
    unsubscribed: 0,
    unreachable: 0,
  };
  for (const row of rows) {
    if (reached(row.contact_state, "contact_attempted") || row.contact_state === "delivered") {
      counts.contact_attempted += 1;
    }
    if (row.contact_state === "delivered" || row.contact_state === "started" || row.completed_at) {
      counts.delivered += 1;
    }
    if (row.contact_state === "started" || row.completed_at) counts.started += 1;
    if (row.completed_at || row.contact_state === "completed") counts.completed += 1;
    if (row.contact_state === "declined") counts.declined += 1;
    if (row.contact_state === "unsubscribed") counts.unsubscribed += 1;
    if (row.contact_state === "unreachable") counts.unreachable += 1;
  }
  return counts;
}

export function completionRate(rows: SurveyFunnelRow[]): RateReport {
  const eligible = rows.length;
  const completed = rows.filter((r) => r.completed_at || r.contact_state === "completed").length;
  return {
    completed,
    eligible,
    completion_rate: eligible === 0 ? null : completed / eligible,
  };
}

export function completionRateByVerdict(rows: SurveyFunnelRow[]): Record<string, RateReport> {
  const groups = new Map<string, SurveyFunnelRow[]>();
  for (const row of rows) {
    const key = row.verdict ?? "unknown";
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  const out: Record<string, RateReport> = {};
  for (const [key, list] of groups) out[key] = completionRate(list);
  return out;
}

/**
 * Observational only. Returns null when a denominator is missing.
 * Does not compute statistical significance.
 */
export function rateOrNull(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export interface LevelBObservation {
  verdict: VerdictType | null;
  kind: "day30" | "day90" | "day365" | null;
  contact_state: ContactState | null;
  completed_at: string | null;
  scoring_schema_id: string | null;
  decision_type: string | null;
  baseline_present: boolean;
  financial_stress: number | null;
  emergency_reserve_band: string | null;
  cash_margin_band: string | null;
  payment_difficulty: string | null;
  unexpected_expense_resilience: string | null;
  decision_confidence: number | null;
  survey_financial_stress: number | null;
  survey_decision_state: string | null;
}

export interface MissingnessReport {
  field: string;
  observed: number;
  missing: number;
  missing_rate: number | null;
}

function isMissing(value: unknown): boolean {
  if (value == null) return true;
  if (value === "unknown") return true;
  return false;
}

export function missingness(
  rows: LevelBObservation[],
  fields: Array<keyof LevelBObservation>,
): MissingnessReport[] {
  const n = rows.length;
  return fields.map((field) => {
    const missing = rows.filter((row) => isMissing(row[field])).length;
    const observed = n - missing;
    return {
      field,
      observed,
      missing,
      missing_rate: rateOrNull(missing, n),
    };
  });
}

export function completionRateByCheckpoint(
  rows: SurveyFunnelRow[],
): Record<string, RateReport> {
  const groups = new Map<string, SurveyFunnelRow[]>();
  for (const row of rows) {
    const list = groups.get(row.kind) ?? [];
    list.push(row);
    groups.set(row.kind, list);
  }
  const out: Record<string, RateReport> = {};
  for (const [key, list] of groups) out[key] = completionRate(list);
  return out;
}

export const LEVEL_B_DISCLAIMER =
  "Observational only. Missing is not a negative outcome. " +
  "Differences between overriders and compliers are not causal effects of HōMI. " +
  "No p-values. No public predictive claim.";

export function levelBNotebook(rows: LevelBObservation[]): {
  disclaimer: string;
  sample_size: {
    checkpoint_rows: number;
    completed_surveys: number;
    baselines_present: number;
    baselines_missing: number;
  };
  response_rate: RateReport;
  response_rate_by_checkpoint: Record<string, RateReport>;
  response_rate_by_verdict: Record<string, RateReport>;
  missingness: MissingnessReport[];
} {
  const funnel: SurveyFunnelRow[] = rows.map((row) => ({
    verdict: row.verdict,
    kind: row.kind ?? "day30",
    contact_state: row.contact_state ?? "eligible",
    completed_at: row.completed_at,
    scoring_schema_id: row.scoring_schema_id,
    decision_type: row.decision_type,
  }));
  const baselinesPresent = rows.filter((r) => r.baseline_present).length;
  return {
    disclaimer: LEVEL_B_DISCLAIMER,
    sample_size: {
      checkpoint_rows: rows.length,
      completed_surveys: funnel.filter((r) => r.completed_at).length,
      baselines_present: baselinesPresent,
      baselines_missing: rows.length - baselinesPresent,
    },
    response_rate: completionRate(funnel),
    response_rate_by_checkpoint: completionRateByCheckpoint(funnel),
    response_rate_by_verdict: completionRateByVerdict(funnel),
    missingness: missingness(rows, [
      "financial_stress",
      "emergency_reserve_band",
      "cash_margin_band",
      "payment_difficulty",
      "unexpected_expense_resilience",
      "decision_confidence",
      "survey_financial_stress",
      "survey_decision_state",
    ]),
  };
}
