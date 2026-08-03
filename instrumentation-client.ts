import * as Sentry from "@sentry/nextjs";

// Client-side Sentry init (Next.js instrumentation-client.ts).
// Mirrors sentry.server.config.ts / sentry.edge.config.ts: only init when a
// DSN is configured so the SDK is fully disabled (zero overhead) otherwise.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    environment: process.env.VERCEL_ENV ?? "development",
    // Errors are the launch-gate signal; keep tracing off until there's a
    // deliberate performance-monitoring decision (and budget) behind it.
    tracesSampleRate: 0,
  });
}
