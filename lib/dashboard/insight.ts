/**
 * Dashboard narrative — rule-based and honest by construction. Every sentence
 * is derived from rows the page already fetched; nothing is invented (brand
 * canon: no invented numbers). First matching rule wins; null means "no earned
 * insight yet" and the caller falls back to neutral copy.
 *
 * Pure module: no Supabase, no Date.now() without an injectable `now`.
 */

import { VERDICT_META, type VerdictKey } from "@/lib/brand";

/** The assessment columns the narrative reads (dashboard query subset). */
export interface AssessmentReading {
  overall_score: number | null;
  verdict: string | null;
  financial_score: number | null;
  emotional_score: number | null;
  timing_score: number | null;
  /** completed_at ?? created_at */
  date: string;
}

export interface InsightInput {
  latest: AssessmentReading | null;
  previous: AssessmentReading | null;
  checkinsThisWeek: number;
}

const VERDICT_RANK: Record<VerdictKey, number> = {
  NOT_YET: 0,
  BUILD_FIRST: 1,
  ALMOST_THERE: 2,
  READY: 3,
};

const PILLAR_COLUMNS = [
  { key: "financial_score", name: "Financial Reality" },
  { key: "emotional_score", name: "Emotional Truth" },
  { key: "timing_score", name: "Perfect Timing" },
] as const;

function verdictRank(verdict: string | null): number | null {
  return verdict && verdict in VERDICT_RANK ? VERDICT_RANK[verdict as VerdictKey] : null;
}

function verdictLabel(verdict: string | null): string | null {
  return verdict && verdict in VERDICT_META ? VERDICT_META[verdict as VerdictKey].label : null;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "your last assessment";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

/**
 * The pillar that moved the most between two assessments. Ties resolve in
 * canonical pillar order (financial → emotional → timing). Null when either
 * side lacks pillar scores.
 */
export function movedPillar(
  latest: AssessmentReading,
  previous: AssessmentReading,
): { name: string; delta: number } | null {
  let best: { name: string; delta: number } | null = null;
  for (const pillar of PILLAR_COLUMNS) {
    const now = latest[pillar.key];
    const then = previous[pillar.key];
    if (now === null || then === null) continue;
    const delta = Math.round(now) - Math.round(then);
    if (best === null || Math.abs(delta) > Math.abs(best.delta)) {
      best = { name: pillar.name, delta };
    }
  }
  return best;
}

/** One true sentence about where the user stands, or null when nothing is earned. */
export function dashboardInsight(input: InsightInput): string | null {
  const { latest, previous, checkinsThisWeek } = input;
  if (!latest) return null;

  const latestRank = verdictRank(latest.verdict);
  const prevRank = previous ? verdictRank(previous.verdict) : null;
  const label = verdictLabel(latest.verdict);

  // 1. Verdict crossed upward — the biggest moment the product has.
  if (previous && latestRank !== null && prevRank !== null && label && latestRank > prevRank) {
    return `You crossed into ${label} on ${fmtDate(latest.date)} — that's real movement.`;
  }

  // 2. Verdict moved down — honest, protective, names the driver.
  if (previous && latestRank !== null && prevRank !== null && label && latestRank < prevRank) {
    const moved = movedPillar(latest, previous);
    const driver = moved && moved.delta < 0 ? ` — ${moved.name} gave the most ground` : "";
    return `Your verdict moved to ${label}${driver}. Worth an honest look.`;
  }

  // 3 & 4. Score moved within the same verdict band.
  if (previous && latest.overall_score !== null && previous.overall_score !== null) {
    const delta = Math.round(latest.overall_score) - Math.round(previous.overall_score);
    const moved = movedPillar(latest, previous);
    if (delta > 0) {
      const driver = moved && moved.delta > 0 ? ` — ${moved.name} did the lifting` : "";
      return `Your score is up ${delta} since ${fmtDate(previous.date)}${driver}.`;
    }
    if (delta < 0) {
      const driver = moved && moved.delta < 0 ? ` — ${moved.name} slipped the most` : "";
      return `Your score is down ${Math.abs(delta)} since ${fmtDate(previous.date)}${driver}.`;
    }
  }

  // 5. First measurement on the books.
  if (!previous) {
    return "Your first measurement is on the books. The trajectory starts here.";
  }

  // 6. Cadence — the user is showing up.
  if (checkinsThisWeek >= 5) {
    return `${checkinsThisWeek} check-ins this week — your read on yourself is getting sharper.`;
  }

  // 7. Holding steady.
  if (latest.overall_score !== null) {
    return `Holding steady at ${Math.round(latest.overall_score)} since ${fmtDate(previous.date)}.`;
  }

  return null;
}

/** True when the latest verdict outranks the previous one (READY > … > NOT_YET). */
export function verdictImproved(latest: string | null, previous: string | null): boolean {
  const l = verdictRank(latest);
  const p = verdictRank(previous);
  return l !== null && p !== null && l > p;
}

/**
 * Days the current verdict has been held: walks the newest-first assessment
 * list back through the consecutive streak of the latest verdict. Null when
 * there is no verdict to hold.
 */
export function verdictHeldDays(
  assessments: Array<{ verdict: string | null; date: string }>,
  now: number = Date.now(),
): number | null {
  if (assessments.length === 0) return null;
  const latestVerdict = assessments[0].verdict;
  if (!latestVerdict) return null;
  let heldSince = assessments[0].date;
  for (let i = 1; i < assessments.length; i++) {
    if (assessments[i].verdict === latestVerdict) heldSince = assessments[i].date;
    else break;
  }
  const start = new Date(heldSince).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((now - start) / 86_400_000));
}

/**
 * The user's local hour from a request timezone (Vercel's
 * `x-vercel-ip-timezone` header), or null when unknown/invalid — the server's
 * own clock is UTC and must never drive a "Good morning".
 */
export function hourInTimezone(timeZone: string | null, now: Date = new Date()): number | null {
  if (!timeZone) return null;
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone,
    }).format(now);
    const hour = Number(formatted);
    if (!Number.isFinite(hour)) return null;
    return hour === 24 ? 0 : hour; // some ICU builds render midnight as "24"
  } catch {
    return null;
  }
}

/** Time-of-day greeting; neutral "Welcome back" whenever the hour is unknown. */
export function greetingForHour(hour: number | null): string {
  if (hour === null || hour < 0 || hour > 23) return "Welcome back";
  if (hour < 5) return "Welcome back";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
