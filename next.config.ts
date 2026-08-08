import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Content Security Policy (AUDIT-2026-07-08 T1.5, enforce half).
 *
 * Sent enforced (`Content-Security-Policy`) on production builds — Vercel
 * preview + prod and local `next build && next start` — and mirrored as
 * `Content-Security-Policy-Report-Only` everywhere so violations keep
 * surfacing in devtools. Under `next dev` only the report-only header is
 * sent: webpack HMR / React Fast Refresh need eval + websocket freedom
 * that an enforced strict policy blocks.
 *
 * External origins the browser actually loads (audit evidence):
 *  · Supabase — browser client calls REST/Auth/Storage over https and
 *    Realtime over wss (lib/supabase/client.ts); the project ref is
 *    env-driven, hence the *.supabase.co wildcards.
 *  · Plaid Link — lazy chunk on /connections loads
 *    https://cdn.plaid.com/link/v2/stable/link-initialize.js
 *    (node_modules/react-plaid-link/dist/index.esm.js:342) and iframes
 *    cdn.plaid.com; Link then calls the PLAID_ENV API host
 *    (lib/plaid/client.ts:21,26) → production.plaid.com / sandbox.plaid.com.
 *  · PostHog — active only when NEXT_PUBLIC_POSTHOG_KEY is set; the inline
 *    init stub injects array.js from *-assets.i.posthog.com and posts
 *    events to the api_host (default us.i.posthog.com), both env-driven
 *    (components/analytics/AnalyticsScripts.tsx:18,23) → *.posthog.com.
 *  · Anthropic — api.anthropic.com is called server-side only
 *    (app/api/advisor/route.ts:261, twin:94, trinity:120); kept in
 *    connect-src at zero browser cost for parity with the soak policy.
 *
 * Deliberately absent (verified unused in the browser):
 *  · js.stripe.com / checkout.stripe.com — no Stripe.js; checkout and the
 *    billing portal are full-page redirects, which CSP does not govern
 *    (components/marketing/PricingCheckoutButton.tsx:76,
 *    components/settings/SubscriptionSection.tsx:35).
 *  · Sentry ingest — server-only init; client init intentionally deferred
 *    (instrumentation.ts).
 *  · va.vercel-scripts.com — Speed Insights serves its script and beacon
 *    same-origin at /_vercel/speed-insights/* in production
 *    (app/layout.tsx:98).
 *  · fonts — self-hosted via next/font/local (app/fonts.ts) → 'self'.
 *
 * 'unsafe-inline' in script-src is required by Next's inline chunks;
 * dropping it needs nonce middleware — a deliberate follow-up, not this PR.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.plaid.com https://*.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://*.posthog.com https://production.plaid.com https://sandbox.plaid.com",
  "frame-src https://cdn.plaid.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
  "report-uri /api/csp-report",
  "report-to csp",
].join("; ");

const nextConfig: NextConfig = {
  // Typecheck + lint run as separate CI steps (npm run typecheck / lint);
  // skipping inside `next build` keeps build minutes down.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    // Legacy / poisoned calculator slugs from satellite catalogs → canonical routes.
    const toolAliases = [
      ["mortgage-payment", "mortgage"],
      ["home-equity", "heloc"],
      ["apr-comparison", "apr-compare"],
    ] as const;
    return [
      ...toolAliases.flatMap(([from, to]) => [
        { source: `/tools/${from}`, destination: `/tools/${to}`, permanent: true },
        // Spanish was removed; fold the legacy /es alias straight onto the
        // canonical route so these still resolve in one hop, not two.
        { source: `/es/tools/${from}`, destination: `/tools/${to}`, permanent: true },
      ]),
      // One-hop /es variants of the wave-3 consolidations. Correct per Next.js
      // array-order semantics, BUT observed on Vercel production (2026-08-03):
      // /es/* requests are answered by an earlier routing phase where the
      // /es/:path* catch-all wins, so these resolve in two hops there (same
      // for the older /es tool aliases above). Harmless — both hops are 308s.
      // Kept for self-hosted correctness; investigate routes-manifest.json if
      // one-hop on Vercel ever matters.
      { source: "/es/tools/scenarios", destination: "/scenarios#saved", permanent: true },
      { source: "/es/couples", destination: "/household#couples", permanent: true },
      { source: "/es/family", destination: "/household#family", permanent: true },
      { source: "/es/blog", destination: "/guides", permanent: true },
      { source: "/es/learning", destination: "/guides", permanent: true },
      // Spanish locale removed. Everything still pointing at /es folds onto
      // its unprefixed equivalent. Listed after the tool aliases so those win.
      { source: "/es", destination: "/", permanent: true },
      { source: "/es/:path*", destination: "/:path*", permanent: true },
      // Portals folded into role homes (operate program D2). The redirect()-only
      // stub pages were deleted; bookmarks and legacy links resolve here.
      { source: "/employee/portal", destination: "/employee/dashboard", permanent: true },
      { source: "/employee/portal/:path*", destination: "/employee/dashboard", permanent: true },
      { source: "/partner/portal", destination: "/partner/dashboard", permanent: true },
      { source: "/partner/portal/:path*", destination: "/partner/dashboard", permanent: true },
      // Orphaned admin-gated marketing analytics page removed; its content was a
      // strict subset of /admin/analytics, whose layout wall gates arrivals.
      { source: "/analytics", destination: "/admin/analytics", permanent: true },
      // Wave-3 consolidations (Plans.md D2/D3/D5): Decision Lab saved scenarios
      // merged into Scenario Studio; couples/family folded into /household as
      // hash modes; blog/learning indexes folded into the /guides hub (their
      // slug routes still render — deep links unaffected).
      { source: "/tools/scenarios", destination: "/scenarios#saved", permanent: true },
      { source: "/couples", destination: "/household#couples", permanent: true },
      { source: "/family", destination: "/household#family", permanent: true },
      { source: "/blog", destination: "/guides", permanent: true },
      { source: "/learning", destination: "/guides", permanent: true },
      // Dogfood SPA + Money Reality consolidations
      { source: "/planner", destination: "/money/budget", permanent: true },
      { source: "/finance", destination: "/money/budget", permanent: true },
      { source: "/finance/:path*", destination: "/money/budget", permanent: true },    ];
  },
  async headers() {
    return [
      {
        // Fonts never change in place (a regenerated file gets a new name),
        // so let browsers and the CDN cache them for a year.
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // PWA control plane: never pin stale SW/manifest/offline via CDN HTTP cache.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/offline.html",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/architecture.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=60, must-revalidate" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Same policy in both headers: enforced on production builds,
          // report-only everywhere for ongoing violation visibility.
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }]
            : []),
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};


/**
 * Sentry source-map upload — opt-in, and inert until fully configured.
 *
 * Without this wrapper Sentry still receives errors (see sentry.server.config.ts
 * / sentry.edge.config.ts), but every frame points at minified bundled output
 * rather than real files, which defeats most of the reason for enabling it.
 *
 * All three of SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT are required
 * before the wrapper engages. Guarding on all three rather than the token alone
 * means a half-configured environment produces the previous build byte for byte
 * instead of failing the build partway through upload — the build stays green
 * on any machine that hasn't been given Sentry credentials, CI included.
 *
 * Notes on the options:
 *  · deleteSourcemapsAfterUpload — maps are uploaded to Sentry, then removed
 *    from the output. Without it they ship publicly and hand any visitor your
 *    unminified server and client source.
 *  · widenClientFileUpload is left off deliberately. It broadens *client* map
 *    upload, and client-side Sentry.init is currently deferred on purpose
 *    (instrumentation.ts) for Lighthouse budget reasons, so it would add build
 *    time for maps nothing symbolicates. Turn it on with client init.
 *  · No tunnelRoute: it exists to dodge ad blockers on *browser* ingest, and
 *    there is no browser ingest here. It would also need a CSP connect-src
 *    entry — the "Sentry ingest deliberately absent" note above stays true.
 *  · telemetry off: no build-time analytics to Sentry.
 */
const sentryConfigured = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

export default sentryConfigured
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Quiet locally, verbose in CI where the log is the only record.
      silent: !process.env.CI,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      // Was `disableLogger: true`, deprecated in @sentry/nextjs v10 and slated
      // for removal — this is the replacement spelling for the same tree-shake.
      webpack: { treeshake: { removeDebugLogging: true } },
      telemetry: false,
    })
  : nextConfig;
