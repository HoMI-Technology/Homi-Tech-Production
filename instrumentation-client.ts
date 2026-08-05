// Client-side Sentry init (Next.js instrumentation-client.ts).
// Mirrors sentry.server.config.ts / sentry.edge.config.ts: only init when a
// DSN is configured.
//
// The SDK is dynamic-imported INSIDE the DSN guard: a static
// `import * as Sentry from "@sentry/nextjs"` ships the whole browser SDK
// (~75 KB gz) in every route's initial bundle even when the DSN is unset,
// which blew the §11 lighthouse script budget on every route. Lazy loading
// keeps error capture (init runs as soon as the async chunk lands) while
// keeping the SDK off the critical path and out of the initial bundle.
// Tradeoff, accepted: errors thrown in the first ~100ms before the chunk
// arrives are not captured.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      environment: process.env.VERCEL_ENV ?? "development",
      // Errors are the launch-gate signal; keep tracing off until there's a
      // deliberate performance-monitoring decision (and budget) behind it.
      tracesSampleRate: 0,
    });
  });
}

// The dynamic import above is this file's only dependency; without a
// top-level import/export TS treats it as a script (TS2306).
export {};
