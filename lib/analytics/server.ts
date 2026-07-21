import { sanitizePosthogHost } from "@/lib/analytics/posthog-host";

/**
 * Server-side analytics capture — the truth-mirror for funnel-critical events.
 * Client-side track() (lib/analytics.ts) loses 25-40% of events to content
 * blockers; money-grade steps (assessment saved, checkout completed) are
 * therefore ALSO captured here, straight from the API route that did the work.
 *
 * Same occurrence-only rule as the client sink: event names + coarse labels,
 * never scores, answers, amounts, or emails. distinct_id is the internal user
 * UUID (already pseudonymous). Fire-and-forget: analytics must never add
 * latency or failure modes to a product path — callers do not await this.
 */

const POSTHOG_HOST = sanitizePosthogHost(process.env.NEXT_PUBLIC_POSTHOG_HOST);

export function captureServerEvent(
  event: string,
  distinctId: string,
  props?: Record<string, string | number>,
): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  void fetch(`${POSTHOG_HOST}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      event,
      distinct_id: distinctId,
      properties: { ...props, $lib: "homi-server" },
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {
    // Swallow — see contract above.
  });
}
