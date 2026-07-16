import * as Sentry from "@sentry/nextjs";

// Init only when a DSN is configured — skipping init() entirely is Sentry's
// recommended way to disable the SDK with zero overhead (an `enabled: false`
// init still pays instrumentation cost). Release is pinned to the deploy's
// commit SHA so every event maps to an exact deployment.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    environment: process.env.VERCEL_ENV ?? "development",
    // Errors are the launch-gate signal; keep tracing off until there's a
    // deliberate performance-monitoring decision (and budget) behind it.
    tracesSampleRate: 0,
  });
}
