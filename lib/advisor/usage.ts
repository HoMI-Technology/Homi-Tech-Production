import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Which cap is actually holding the user back.
 *
 * The quota RPCs return a bare boolean, so the reason has to be derived from the
 * counters — and it matters. At daily-cap usage every tier exhausts its monthly
 * allowance before month-end (free is 5/day against 60/month; plus 25/300; pro and
 * family 100/1200), so a flat "you've used today's messages" is a false statement
 * for roughly the back half of the month.
 */
export type QuotaScope = "daily" | "monthly";

export interface AdvisorUsage {
  dayCount: number;
  monthCount: number;
  dailyLimit: number;
  monthlyLimit: number;
  remainingToday: number;
  remainingThisMonth: number;
  /** Null while the user is under both caps. */
  bindingScope: QuotaScope | null;
  /** ISO instant the binding cap lifts. Null when nothing is binding. */
  resetsAt: string | null;
}

export interface AdvisorUsageLimits {
  advisorMessagesPerDay: number;
  advisorMessagesPerMonth: number;
}

/**
 * Boundaries mirror the quota RPCs, which key off Postgres `current_date` and
 * `date_trunc('month', current_date)`.
 *
 * VERIFIED 2026-08-23 against project giyycykxkzfbowiapxpd:
 *   current_setting('TimeZone') = 'UTC'
 *   current_date                = 2026-08-23
 *   (current_date + 1)          = 2026-08-24 00:00:00+00
 * which is exactly what nextDailyResetIso returns for that instant.
 *
 * Keep in lockstep with supabase/migrations/00030_advisor_monthly_quota.sql. If the
 * database session timezone ever moves off UTC, these move with it — re-run the probe
 * above rather than assuming.
 *
 * Note for product: UTC midnight is 8:00 PM US Eastern (7:00 PM in winter), so a
 * user's quota "day" ends mid-evening local, not at their midnight. That is shipped
 * behavior, surfaced honestly by QuotaNotice rather than hidden.
 */
export function nextDailyResetIso(now: Date): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  ).toISOString();
}

export function nextMonthlyResetIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

/** `YYYY-MM-DD` in UTC, matching the `day` date column. */
function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function clampNonNegative(n: number): number {
  return n > 0 ? n : 0;
}

/**
 * Turn raw counters into the shape the copy layer needs.
 *
 * When both caps are blown we report **monthly**, because that is the longer wait —
 * telling someone their messages return tomorrow when they return next month is the
 * exact defect this function exists to prevent.
 */
export function summarizeAdvisorUsage(
  counts: { dayCount: number; monthCount: number },
  limits: AdvisorUsageLimits,
  now: Date,
): AdvisorUsage {
  const { dayCount, monthCount } = counts;
  const dailyLimit = limits.advisorMessagesPerDay;
  const monthlyLimit = limits.advisorMessagesPerMonth;

  const monthlyBinding = monthCount >= monthlyLimit;
  const dailyBinding = dayCount >= dailyLimit;

  const bindingScope: QuotaScope | null = monthlyBinding
    ? "monthly"
    : dailyBinding
      ? "daily"
      : null;

  return {
    dayCount,
    monthCount,
    dailyLimit,
    monthlyLimit,
    remainingToday: clampNonNegative(dailyLimit - dayCount),
    remainingThisMonth: clampNonNegative(monthlyLimit - monthCount),
    bindingScope,
    resetsAt:
      bindingScope === "monthly"
        ? nextMonthlyResetIso(now)
        : bindingScope === "daily"
          ? nextDailyResetIso(now)
          : null,
  };
}

/**
 * Read the signed-in user's own usage rows. Relies on the `advisor_usage_owner_select`
 * RLS policy (00013) — no user_id filter is needed, and none would be trusted anyway.
 *
 * Returns null when usage can't be read (table absent mid-migration, transient error).
 * Callers must degrade to a message that claims nothing specific rather than guess.
 */
export async function readAdvisorUsage(
  supabase: SupabaseClient,
  limits: AdvisorUsageLimits,
  now: Date = new Date(),
): Promise<AdvisorUsage | null> {
  const monthStart = utcDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const today = utcDay(now);

  // This runs on the 402 path, where the caller already has a user-facing answer to
  // give. A surprise in the client shape must degrade to "we don't know" rather than
  // turn a paywall message into a 500.
  let rows: Array<{ day: string; count: number | null }>;
  try {
    const { data, error } = await supabase
      .from("advisor_usage")
      .select("day, count")
      .gte("day", monthStart);

    if (error || !data) return null;
    rows = data as Array<{ day: string; count: number | null }>;
  } catch {
    return null;
  }

  let dayCount = 0;
  let monthCount = 0;
  for (const row of rows) {
    const n = typeof row.count === "number" ? row.count : 0;
    monthCount += n;
    if (row.day === today) dayCount = n;
  }

  return summarizeAdvisorUsage({ dayCount, monthCount }, limits, now);
}
