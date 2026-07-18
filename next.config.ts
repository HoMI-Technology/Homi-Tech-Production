import type { NextConfig } from "next";

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
].join("; ");

const nextConfig: NextConfig = {
  // Typecheck + lint run as separate CI steps (npm run typecheck / lint);
  // skipping inside `next build` keeps build minutes down.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,
  poweredByHeader: false,
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

export default nextConfig;
