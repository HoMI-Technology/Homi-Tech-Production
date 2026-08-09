import { unstable_cache } from "next/cache";
import { sanitizePosthogHost } from "@/lib/analytics/posthog-host";
import { env } from "@/lib/env";

/**
 * PostHog Query API (HogQL) client for the owner analytics dashboard.
 *
 * Server-only, read-only, occurrence-counts-only: this module never selects
 * person properties, URLs, or event properties beyond the session id used to
 * derive visits / bounce / duration — the same no-PII contract as the capture
 * sinks (lib/analytics.ts, lib/analytics/server.ts).
 *
 * Data source notes:
 * - Web metrics come from the `page_viewed` occurrence event fired by
 *   components/analytics/PageViewBeacon.tsx (the snippet runs with
 *   `capture_pageview:false`, so `$pageview` never exists here).
 * - The funnel uses the product events captured across the app
 *   (assessment_started … share_created).
 *
 * Every fetch is cached for 5 minutes (unstable_cache) — the dashboard is
 * directional, not real-time. Any failure (missing project, bad key, network,
 * PostHog error) resolves to null/[] and the page renders a quiet error note
 * instead of throwing: analytics must never break the app.
 */

export type AnalyticsRange = "7d" | "30d";

export function rangeDays(range: AnalyticsRange): 7 | 30 {
  return range === "7d" ? 7 : 30;
}

export function parseRange(value: string | string[] | undefined): AnalyticsRange {
  return value === "7d" ? "7d" : "30d";
}

export interface OverviewMetrics {
  /** Page views (`page_viewed` occurrences). */
  views: number;
  /** Distinct persons. */
  uniques: number;
  /** Distinct sessions that saw at least one page. */
  visits: number;
  /** Mean seconds between first and last event in a session. */
  avgSessionSeconds: number | null;
  /** % of sessions that saw exactly one page. */
  bounceRatePct: number | null;
}

export interface DailyPoint {
  /** YYYY-MM-DD (UTC). */
  day: string;
  views: number;
  uniques: number;
}

export interface FunnelStep {
  event: string;
  users: number;
  occurrences: number;
}

export const FUNNEL_EVENTS = [
  "assessment_started",
  "assessment_completed",
  "checkout_started",
  "checkout_completed",
  "share_created",
] as const;

/** Path habit funnel for NOT_YET activation (mirrors lib/readiness/analytics). */
export const PATH_HABIT_FUNNEL_EVENTS = [
  "path_generated",
  "path_habit_impression",
  "path_page_viewed",
  "path_start_step_clicked",
  "path_first_step_done",
] as const;

const QUERY_TIMEOUT_MS = 8_000;
const CACHE_REVALIDATE_S = 300;

interface HogQLResponse {
  results?: unknown[][];
  columns?: string[];
  detail?: string;
  code?: string;
}

function posthogHost(): string {
  return sanitizePosthogHost(env.NEXT_PUBLIC_POSTHOG_HOST);
}

/**
 * Resolve the numeric PostHog project id. Explicit env wins; otherwise the
 * personal key lists projects and we match the one whose public api_token is
 * NEXT_PUBLIC_POSTHOG_KEY (falling back to the first project, which is the
 * common single-project case).
 */
async function resolveProjectId(): Promise<string | null> {
  if (env.POSTHOG_PROJECT_ID) return env.POSTHOG_PROJECT_ID;
  const personalKey = env.POSTHOG_PERSONAL_API_KEY;
  const projectKey = env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!personalKey) return null;
  try {
    const res = await fetch(`${posthogHost()}/api/projects/`, {
      headers: { Authorization: `Bearer ${personalKey}` },
      signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { results?: { id: number; api_token?: string }[] };
    const projects = body.results ?? [];
    const match = projects.find((p) => p.api_token === projectKey) ?? projects[0];
    return match ? String(match.id) : null;
  } catch {
    return null;
  }
}

const getCachedProjectId = unstable_cache(resolveProjectId, ["posthog-project-id"], {
  revalidate: CACHE_REVALIDATE_S,
});

/** Run one HogQL statement. Returns rows mapped to column-name records, or null on any failure. */
async function runHogQL(
  projectId: string,
  query: string,
): Promise<Record<string, unknown>[] | null> {
  const personalKey = env.POSTHOG_PERSONAL_API_KEY;
  if (!personalKey) return null;
  try {
    const res = await fetch(`${posthogHost()}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${personalKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[posthog-analytics] query failed (${res.status})`);
      return null;
    }
    const body = (await res.json()) as HogQLResponse;
    if (!Array.isArray(body.results) || !Array.isArray(body.columns)) return null;
    const columns = body.columns;
    return body.results.map((row) => {
      const record: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        record[col] = row[i];
      });
      return record;
    });
  } catch {
    return null;
  }
}

const getCachedHogQL = unstable_cache(runHogQL, ["posthog-hogql"], {
  revalidate: CACHE_REVALIDATE_S,
});

function toNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * Overview cards + daily trend + funnel for a range. Null when any query
 * fails so the page can show one honest error note rather than half-data.
 */
export async function getAnalyticsBundle(range: AnalyticsRange): Promise<{
  overview: OverviewMetrics;
  daily: DailyPoint[];
  funnel: FunnelStep[];
  pathHabitFunnel: FunnelStep[];
} | null> {
  const projectId = await getCachedProjectId();
  if (!projectId) return null;

  const days = rangeDays(range);
  // days is whitelisted (7|30) by rangeDays — safe to inline; no user input
  // reaches these statements.
  const allFunnelEvents = [...FUNNEL_EVENTS, ...PATH_HABIT_FUNNEL_EVENTS];
  const [overviewRows, sessionRows, dailyRows, funnelRows] = await Promise.all([
    getCachedHogQL(
      projectId,
      `SELECT count() AS views, count(DISTINCT person_id) AS uniques
       FROM events
       WHERE event = 'page_viewed' AND timestamp >= now() - INTERVAL ${days} DAY`,
    ),
    getCachedHogQL(
      projectId,
      `SELECT count() AS visits,
              avg(dur) AS avg_duration_s,
              100 * countIf(pageviews <= 1) / count() AS bounce_pct
       FROM (
         SELECT properties.$session_id AS sid,
                countIf(event = 'page_viewed') AS pageviews,
                dateDiff('second', min(timestamp), max(timestamp)) AS dur
         FROM events
         WHERE timestamp >= now() - INTERVAL ${days} DAY
         GROUP BY sid
         HAVING pageviews > 0
       )`,
    ),
    getCachedHogQL(
      projectId,
      `SELECT toDate(timestamp) AS day, count() AS views, count(DISTINCT person_id) AS uniques
       FROM events
       WHERE event = 'page_viewed' AND timestamp >= now() - INTERVAL ${days} DAY
       GROUP BY day
       ORDER BY day ASC`,
    ),
    getCachedHogQL(
      projectId,
      `SELECT event, count(DISTINCT person_id) AS users, count() AS occurrences
       FROM events
       WHERE timestamp >= now() - INTERVAL ${days} DAY
         AND event IN (${allFunnelEvents.map((e) => `'${e}'`).join(", ")})
       GROUP BY event`,
    ),
  ]);

  if (!overviewRows || !sessionRows || !dailyRows || !funnelRows) return null;

  const overview: OverviewMetrics = {
    views: toNumber(overviewRows[0]?.views) ?? 0,
    uniques: toNumber(overviewRows[0]?.uniques) ?? 0,
    visits: toNumber(sessionRows[0]?.visits) ?? 0,
    avgSessionSeconds: toNumber(sessionRows[0]?.avg_duration_s),
    bounceRatePct: toNumber(sessionRows[0]?.bounce_pct),
  };

  const daily: DailyPoint[] = dailyRows
    .map((r) => ({
      day: String(r.day ?? ""),
      views: toNumber(r.views) ?? 0,
      uniques: toNumber(r.uniques) ?? 0,
    }))
    .filter((d) => d.day);

  const byEvent = new Map(
    funnelRows.map((r) => [
      String(r.event),
      { users: toNumber(r.users) ?? 0, occurrences: toNumber(r.occurrences) ?? 0 },
    ]),
  );
  const funnel: FunnelStep[] = FUNNEL_EVENTS.map((event) => ({
    event,
    users: byEvent.get(event)?.users ?? 0,
    occurrences: byEvent.get(event)?.occurrences ?? 0,
  }));
  const pathHabitFunnel: FunnelStep[] = PATH_HABIT_FUNNEL_EVENTS.map((event) => ({
    event,
    users: byEvent.get(event)?.users ?? 0,
    occurrences: byEvent.get(event)?.occurrences ?? 0,
  }));

  return { overview, daily, funnel, pathHabitFunnel };
}
