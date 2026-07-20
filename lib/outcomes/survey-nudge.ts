/**
 * Outcome-survey nudge content + selection.
 * =========================================
 *
 * Pure helpers shared by the delivery cron (email + push) and its tests. No
 * Supabase or network calls here — callers fetch rows and pass them in, matching
 * lib/notifications/rules.ts.
 */

export type SurveyKind = "day30" | "day90" | "day365";

export interface DueSurveyRow {
  id: string;
  user_id: string;
  kind: SurveyKind;
  due_at: string;
  completed_at: string | null;
  notified_at: string | null;
}

const KIND_DAYS: Record<SurveyKind, number> = { day30: 30, day90: 90, day365: 365 };

/** Notification copy per checkpoint. Honest, no-judgment tone (brand canon). */
export function surveyNudgeCopy(kind: SurveyKind): { title: string; body: string } {
  const days = KIND_DAYS[kind];
  return {
    title: "A quick outcome check-in",
    body: `It's been about ${days} days since your decision. A 30-second, no-judgment read on how it's actually going — either way is useful.`,
  };
}

/** Deep-link target for a due survey. The dashboard renders the prompt. */
export const SURVEY_NUDGE_PATH = "/dashboard";

/**
 * A survey is nudge-eligible when it's due, not completed, and not already
 * notified. Pure predicate so the cron and tests agree on the rule.
 */
export function isNudgeEligible(row: DueSurveyRow, now: Date = new Date()): boolean {
  if (row.completed_at) return false;
  if (row.notified_at) return false;
  const due = new Date(row.due_at).getTime();
  if (Number.isNaN(due)) return false;
  return due <= now.getTime();
}

/**
 * Collapse many due rows to at most one nudge per user (the earliest-due,
 * so the oldest checkpoint wins). Prevents emailing a user several times in
 * one cron pass when checkpoints for different decisions land together.
 */
export function pickOnePerUser(rows: DueSurveyRow[], now: Date = new Date()): DueSurveyRow[] {
  const byUser = new Map<string, DueSurveyRow>();
  for (const row of rows) {
    if (!isNudgeEligible(row, now)) continue;
    const existing = byUser.get(row.user_id);
    if (!existing || new Date(row.due_at) < new Date(existing.due_at)) {
      byUser.set(row.user_id, row);
    }
  }
  return [...byUser.values()];
}
