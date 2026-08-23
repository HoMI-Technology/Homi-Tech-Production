import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { PROTECTED_PREFIXES } from "@/lib/auth/protected-routes";

/**
 * Crawl-budget hygiene: every auth-gated product shell 307s crawlers to
 * sign-in (which is noindexed via X-Robots-Tag), so the whole protected
 * surface is disallowed. Derived from the middleware SSOT
 * (lib/auth/protected-routes) so a newly protected route can never ship
 * crawlable — the previous hand-copied list had drifted 18 routes behind.
 *
 * Deliberately NOT disallowed:
 *  · public product routes (/tools, /scenarios, /shadow-score, /assessment,
 *    /demo, /onboarding, /calibration, /path) — public by design;
 *  · /plan — public but noindexed via metadata (app/(product)/plan/layout.tsx);
 *    a robots.txt disallow would hide that noindex from crawlers.
 */
export const ROBOTS_DISALLOW = [
  "/api/",
  "/auth/callback",
  ...PROTECTED_PREFIXES,
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...ROBOTS_DISALLOW],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
