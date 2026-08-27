/**
 * Score progress + freshness helpers for the dashboard ScoreProgressCard.
 *
 * Pure module — no Next, no storage, no scoring internals. Band boundaries
 * are derived by probing the public scoring seam (`scoreToVerdict`), never
 * redeclared as literals here: lib/scoring/public.ts is the single source of
 * truth and __tests__/scoring-public.test.ts pins it to the frozen engine.
 */

import type { VerdictKey } from "@/lib/brand";
import { scoreToVerdict } from "@/lib/scoring/public";

const DAY_MS = 1000 * 60 * 60 * 24;

export type NextBand = {
  verdict: VerdictKey;
  /** First whole score inside the next band. */
  threshold: number;
  /** Whole points needed to cross into the next band (>= 1). */
  pointsNeeded: number;
};

export type BandProgress = {
  /** Band the rounded score sits in right now. */
  verdict: VerdictKey;
  /** First whole score inside the current band. */
  floor: number;
  /** Null only in the top band — there is no higher verdict to progress to. */
  next: NextBand | null;
};

/**
 * Where a score sits inside its verdict band and what the next band costs.
 * Boundaries come from probing the public verdict mapping, so a threshold
 * change in the engine moves this card without an edit here.
 */
export function bandProgress(score: number): BandProgress {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const verdict = scoreToVerdict(s);

  let floor = s;
  while (floor > 0 && scoreToVerdict(floor - 1) === verdict) floor -= 1;

  for (let t = s + 1; t <= 100; t += 1) {
    const above = scoreToVerdict(t);
    if (above !== verdict) {
      return { verdict, floor, next: { verdict: above, threshold: t, pointsNeeded: t - s } };
    }
  }
  return { verdict, floor, next: null };
}

/** Whole days between an ISO timestamp and `now`; null on missing/garbage input. */
export function daysAgo(savedAt: string | null, now: Date = new Date()): number | null {
  if (!savedAt) return null;
  const then = new Date(savedAt).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.floor((now.getTime() - then) / DAY_MS);
}

/**
 * Honest money-data freshness. "Current" means saved today; anything older
 * states its age in days; never-saved says so rather than faking recency.
 * A future or unreadable stamp is treated as current rather than as a lie.
 */
export function moneyFreshnessLabel(savedAt: string | null, now: Date = new Date()): string {
  const days = daysAgo(savedAt, now);
  if (days === null) return "Money data not saved yet";
  if (days <= 0) return "Money data current";
  return `Money data ${days} day${days === 1 ? "" : "s"} old`;
}

/**
 * Newest of several ISO save stamps (finance snapshot, budget ledger, …).
 * Money data is as fresh as its most recent write; null when nothing was
 * ever saved.
 */
export function freshestIso(...stamps: Array<string | null>): string | null {
  let best: string | null = null;
  let bestMs = Number.NEGATIVE_INFINITY;
  for (const stamp of stamps) {
    if (!stamp) continue;
    const ms = new Date(stamp).getTime();
    if (!Number.isFinite(ms)) continue;
    if (ms > bestMs) {
      bestMs = ms;
      best = stamp;
    }
  }
  return best;
}

/**
 * "Score from Mar 4, 2026" — the honesty half of the freshness line.
 * Null when the assessment carries no usable date; callers omit the segment
 * rather than guess.
 */
export function scoreFromLabel(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const label = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Score from ${label}`;
}
