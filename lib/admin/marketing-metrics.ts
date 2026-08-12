/**
 * Pure metric helpers for /admin/marketing (PR1.1 integrity).
 * Unit of activation truth: unique users with ≥1 completed assessment in window.
 * Completions (events) are secondary. Cohort rate uses new-account population.
 */

export const MARKETING_SAMPLE_CAP = 10_000;

/** Minimum new accounts before cohort % is shown (avoids 100% of n=1 noise). */
export const MIN_COHORT_N = 5;

export type Severity = "critical" | "warn" | "info" | "ok";

export type CompletionLike = {
  user_id: string | null;
  completed_at: string | null;
  created_at: string;
};

export type NewAccountLike = {
  id: string;
  created_at: string;
};

export type AttentionLike = {
  severity: Severity;
  id?: string;
};

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  warn: 1,
  info: 2,
  ok: 3,
};

/** Prefer completed_at; fall back to created_at for legacy rows. */
export function completionTimestamp(row: CompletionLike): Date {
  return new Date(row.completed_at ?? row.created_at);
}

export function isAtSampleCap(rowCount: number, cap = MARKETING_SAMPLE_CAP): boolean {
  return rowCount >= cap;
}

/** Unique user_ids with ≥1 completion whose timestamp is >= windowStart. */
export function uniqueActivatedUsers(
  rows: CompletionLike[],
  windowStart: Date,
): Set<string> {
  const users = new Set<string>();
  for (const row of rows) {
    if (!row.user_id) continue;
    if (completionTimestamp(row) >= windowStart) users.add(row.user_id);
  }
  return users;
}

/** Raw completion events in window (can be > unique users). */
export function completionEventsInWindow(rows: CompletionLike[], windowStart: Date): number {
  let n = 0;
  for (const row of rows) {
    if (completionTimestamp(row) >= windowStart) n += 1;
  }
  return n;
}

/**
 * New accounts (created_at >= windowStart) who have at least one completion
 * anywhere in `rows` (completed assessment exists). Honest GTM cohort activation.
 */
export function cohortActivatedCount(
  newAccounts: NewAccountLike[],
  completedUserIds: Set<string>,
  windowStart: Date,
): number {
  let n = 0;
  for (const acct of newAccounts) {
    if (new Date(acct.created_at) < windowStart) continue;
    if (completedUserIds.has(acct.id)) n += 1;
  }
  return n;
}

/**
 * Cohort activation rate as integer percent, or null when n &lt; minN or zero denom.
 */
export function cohortActivationRatePct(
  cohortActivated: number,
  newAccountsInWindow: number,
  minN = MIN_COHORT_N,
): number | null {
  if (newAccountsInWindow < minN) return null;
  if (newAccountsInWindow <= 0) return null;
  return Math.round((cohortActivated / newAccountsInWindow) * 100);
}

/** All-time unique users who completed (from sample). */
export function uniqueEverActivated(rows: CompletionLike[]): number {
  const users = new Set<string>();
  for (const row of rows) {
    if (row.user_id) users.add(row.user_id);
  }
  return users.size;
}

/**
 * Daily unique activated users (distinct user_ids completing that UTC day).
 * Input rows should already be filtered to the chart window when possible.
 */
export function dailyUniqueActivatedSeries(
  rows: CompletionLike[],
  since: Date,
  dayCount = 30,
): { date: string; count: number }[] {
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const shortLabel = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  };

  const buckets = new Map<string, Set<string>>();
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    buckets.set(dayKey(d), new Set());
  }

  for (const row of rows) {
    if (!row.user_id) continue;
    const ts = completionTimestamp(row);
    if (ts < since) continue;
    const key = dayKey(ts);
    const set = buckets.get(key);
    if (set) set.add(row.user_id);
  }

  return Array.from(buckets.entries()).map(([date, set]) => ({
    date: shortLabel(date),
    count: set.size,
  }));
}

/** critical → warn → info → ok; stable within same severity. */
export function sortBySeverity<T extends AttentionLike>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const rank = SEVERITY_RANK[a.item.severity] - SEVERITY_RANK[b.item.severity];
      if (rank !== 0) return rank;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}
