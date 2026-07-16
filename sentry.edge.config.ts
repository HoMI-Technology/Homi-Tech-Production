import * as Sentry from "@sentry/nextjs";

// Edge-runtime twin of sentry.server.config.ts — covers middleware and any
// edge route handlers. Same rule: no DSN, no init, zero overhead.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    environment: process.env.VERCEL_ENV ?? "development",
    tracesSampleRate: 0,
  });
}
