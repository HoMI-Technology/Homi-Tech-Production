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
