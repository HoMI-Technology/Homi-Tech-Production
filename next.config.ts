import type { NextConfig } from "next";

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
          // Reporting API endpoint group for CSP violations (newer browsers);
          // legacy browsers use the report-uri directive below. Both point at
          // /api/csp-report so the report-only soak actually collects data.
          {
            key: "Report-To",
            value:
              '{"group":"csp","max_age":10886400,"endpoints":[{"url":"/api/csp-report"}]}',
          },
          {
            // Still REPORT-ONLY: the allowlist already includes every third
            // party the app uses (Supabase, Anthropic, PostHog, Plaid Link,
            // Vercel vitals) so that flipping this to enforcing later is a
            // one-word change that will NOT break bank sync or analytics.
            // Soak on real report data first, then rename to
            // "Content-Security-Policy".
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://*.posthog.com https://*.plaid.com https://va.vercel-scripts.com",
              "script-src 'self' 'unsafe-inline' https://*.posthog.com https://cdn.plaid.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "frame-src 'self' https://cdn.plaid.com https://*.plaid.com",
              "worker-src 'self' blob:",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "report-uri /api/csp-report",
              "report-to csp",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
