/**
 * Default Slack / OG / Twitter share card — static files only.
 *
 * Next.js `app/opengraph-image.*` / `app/twitter-image.*` file conventions
 * must not exist at the app root: a generated OG module would override these
 * paths and ship a gradient wordmark. Serve `public/og-v2.png` and
 * `public/twitter-v2.png` (Brand-PASSed bytes) through metadata only.
 */

import type { Metadata } from "next";

export const SHARE_OG_TITLE = "HōMI";
export const SHARE_OG_DESCRIPTION = "Know when you're ready. Move when it matters.";

export const SHARE_OG_IMAGE = {
  url: "/og-v2.png",
  width: 1200,
  height: 630,
  alt: "HōMI — Know when you're ready. Move when it matters.",
} as const;

export const SHARE_TWITTER_IMAGE = {
  url: "/twitter-v2.png",
  width: 1200,
  height: 600,
  alt: "HōMI — Know when you're ready. Move when it matters.",
} as const;

export function defaultShareOpenGraph(): NonNullable<Metadata["openGraph"]> {
  return {
    title: SHARE_OG_TITLE,
    description: SHARE_OG_DESCRIPTION,
    siteName: "HōMI",
    type: "website",
    images: [SHARE_OG_IMAGE],
  };
}

export function defaultShareTwitter(): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    site: "@homi_tech",
    creator: "@homi_tech",
    title: SHARE_OG_TITLE,
    description: SHARE_OG_DESCRIPTION,
    images: [SHARE_TWITTER_IMAGE],
  };
}
