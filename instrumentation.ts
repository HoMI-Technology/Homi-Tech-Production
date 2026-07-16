import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook (BUILD-BRIEF Tier 0 — observability).
 *
 * Server-side Sentry only, and only when SENTRY_DSN is configured — without
 * it the configs skip Sentry.init() entirely (Sentry's recommended way to
 * fully disable the SDK) and capture calls are dropped no-ops. Client-side
 * init (instrumentation-client.ts) is deliberately deferred: it ships
 * real bundle weight against the enforced Lighthouse budgets, so it lands
 * together with the DSN + a budget check, not speculatively.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/** Captures errors from Server Components, route handlers, and middleware. */
export const onRequestError = Sentry.captureRequestError;
