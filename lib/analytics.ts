/**
 * Minimal, dependency-free analytics sink. Client-only; appends occurrence
 * events to `window.__homiEvents` for later pickup by a real collector.
 *
 * Occurrence-only — NEVER pass scores, verdicts, answer values, or any PII
 * in props.
 *
 * @vercel/analytics wiring is an owner step (needs the dep + Vercel Web
 * Analytics toggle).
 */

export interface AnalyticsEvent {
  event: string;
  props?: Record<string, string | number>;
  ts: number;
}

interface PostHogLike {
  capture: (event: string, props?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    __homiEvents?: AnalyticsEvent[];
    posthog?: PostHogLike;
  }
}

/**
 * Coarse page section for the `page_viewed` occurrence event — first path
 * segment only, lowercase alphanumeric/dash, max 24 chars. Never includes
 * dynamic segments (share tokens, ids): occurrence-only, matching the sink's
 * no-PII contract.
 */
export function pageSection(pathname: string): string {
  const first = (pathname.split("/")[1] ?? "").toLowerCase();
  const cleaned = first.replace(/[^a-z0-9-]/g, "").slice(0, 24);
  return cleaned || "home";
}

export function track(event: string, props?: Record<string, string | number>): void {
  if (typeof window === "undefined") return;
  if (!window.__homiEvents) window.__homiEvents = [];
  window.__homiEvents.push({ event, props, ts: Date.now() });
  // Forward to PostHog when its snippet is loaded (activated by
  // NEXT_PUBLIC_POSTHOG_KEY via <AnalyticsScripts/>). No-op otherwise.
  try {
    window.posthog?.capture(event, props);
  } catch {
    /* analytics must never break the app */
  }
}
