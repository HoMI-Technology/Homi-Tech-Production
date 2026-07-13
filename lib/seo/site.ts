/**
 * Canonical production site URL. Same value/env var used by app/layout.tsx
 * (metadataBase), app/sitemap.ts, and app/robots.ts — kept here as a single
 * reusable export so new SEO code (JSON-LD, canonicals) doesn't redefine or
 * drift from the existing fallback host.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homitechnology.com";
