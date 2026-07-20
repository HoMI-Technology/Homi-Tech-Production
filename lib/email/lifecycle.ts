/**
 * Lifecycle email planning — pure functions, no I/O, fully unit-tested.
 * The cron route feeds these a window of recent assessments and sends
 * whatever comes back; every send is still deduped by the email_sends
 * ledger, so planners only need to be approximately right about windows.
 */

export interface LifecycleAssessmentRow {
  id: string;
  user_id: string;
  completed_at: string | null;
  is_shadow: boolean | null;
}

export type LifecycleSendKind = "reassess30" | "outcome30" | "outcome90" | "outcome365";

export interface PlannedSend {
  kind: LifecycleSendKind;
  assessmentId: string;
  userId: string;
  /** Deterministic ledger key — one send per (kind, assessment), ever. */
  dedupeKey: string;
  daysSince: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Outcome-survey checkpoints (day 30 / 90 / 365 after a completed assessment)
 * mirror the outcome_surveys schema. Each checkpoint stays "due" for a 14-day
 * grace window so a paused cron catches up instead of silently skipping a
 * cohort; the ledger prevents duplicates within the window.
 */
const OUTCOME_CHECKPOINTS: Array<{ kind: LifecycleSendKind; day: number }> = [
  { kind: "outcome30", day: 30 },
  { kind: "outcome90", day: 90 },
  { kind: "outcome365", day: 365 },
];

const GRACE_DAYS = 14;

export function daysBetween(fromIso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(fromIso).getTime()) / DAY_MS);
}

/**
 * Latest completed assessment per user. Input may contain many assessments per
 * user in any order; output keeps exactly one (the newest by completed_at).
 */
export function latestPerUser(rows: LifecycleAssessmentRow[]): LifecycleAssessmentRow[] {
  const byUser = new Map<string, LifecycleAssessmentRow>();
  for (const row of rows) {
    if (!row.completed_at) continue;
    const existing = byUser.get(row.user_id);
    if (!existing || new Date(row.completed_at) > new Date(existing.completed_at!)) {
      byUser.set(row.user_id, row);
    }
  }
  return [...byUser.values()];
}

/**
 * Reassessment nudges: a user's LATEST assessment is 30+ days old (a newer
 * assessment resets the clock — that's why this must run on latest-per-user,
 * never on raw rows). One nudge per assessment, ever (ledger key on the
 * assessment id): retaking creates a new latest with its own future nudge, so
 * the loop continues without ever nagging twice about the same stale result.
 */
export function planReassessmentNudges(
  rows: LifecycleAssessmentRow[],
  now: Date,
): PlannedSend[] {
  return latestPerUser(rows)
    .map((row) => ({ row, daysSince: daysBetween(row.completed_at!, now) }))
    .filter(({ daysSince }) => daysSince >= 30 && daysSince < 30 + GRACE_DAYS)
    .map(({ row, daysSince }) => ({
      kind: "reassess30" as const,
      assessmentId: row.id,
      userId: row.user_id,
      dedupeKey: `reassess30:${row.id}`,
      daysSince,
    }));
}

/**
 * Outcome-survey invitations for every FULL assessment crossing a checkpoint.
 * Shadow assessments are excluded: they carry neutral-assumption inputs, so
 * their outcomes would pollute the verdict-validation dataset.
 */
export function planOutcomeSurveys(
  rows: LifecycleAssessmentRow[],
  now: Date,
): PlannedSend[] {
  const sends: PlannedSend[] = [];
  for (const row of rows) {
    if (!row.completed_at || row.is_shadow) continue;
    const daysSince = daysBetween(row.completed_at, now);
    for (const { kind, day } of OUTCOME_CHECKPOINTS) {
      if (daysSince >= day && daysSince < day + GRACE_DAYS) {
        sends.push({
          kind,
          assessmentId: row.id,
          userId: row.user_id,
          dedupeKey: `${kind}:${row.id}`,
          daysSince,
        });
      }
    }
  }
  return sends;
}
