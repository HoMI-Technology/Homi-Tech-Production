import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { PROTECTED_PREFIXES } from "@/lib/auth/protected-routes";

/**
 * Crawl-budget hygiene. Protected product prefixes stay disallowed
 * (derived from `lib/auth/protected-routes` so a new prefix cannot ship
 * crawlable). Under PR15 those prefixes are also DARK: middleware folds
 * document requests to `/` rather than 307ing crawlers to sign-in.
 *
 * Deliberately NOT disallowed:
 *  · KEEP public surfaces (`/`, `/waitlist`, KEEP `/legal/*`, `/marketing/*`);
 *  · legacy public-classified product URLs (`/tools`, `/scenarios`,
 *    `/shadow-score`, `/assessment`, `/demo`, `/onboarding`, `/calibration`,
 *    `/path`) — DARK, they 308 to `/`; listing them here is optional;
 *  · `/plan` — DARK plus metadata noindex (`app/(product)/plan/layout.tsx`);
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
