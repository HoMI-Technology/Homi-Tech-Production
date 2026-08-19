/**
 * Default Slack / OG / Twitter share card — static files only.
 *
 * Next.js `app/opengraph-image.*` / `app/twitter-image.*` file conventions
 * must not exist at the app root: a generated OG module would override these
 * paths and ship a gradient wordmark. Serve `public/og-v3.png` and
 * `public/twitter-v3.png` (v3 Brand-PASSed bytes) through metadata only.
 */

import type { Metadata } from "next";

export const SHARE_OG_TITLE = "HōMI";
export const SHARE_OG_DESCRIPTION = "Know when you're ready. Move when it matters.";

export const SHARE_OG_IMAGE = {
  url: "/og-v3.png",
  width: 1200,
  height: 630,
  alt: "HōMI — Will you be okay?",
} as const;

export const SHARE_TWITTER_IMAGE = {
  url: "/twitter-v3.png",
  width: 1200,
  height: 600,
  alt: "HōMI — Will you be okay?",
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

/**
 * Next's `Metadata["twitter"]` is a union. The base `TwitterMetadata`
 * member has no `card` (it defaults to summary). This helper always
 * ships `summary_large_image`, so the return type says so.
 */
export function defaultShareTwitter(): NonNullable<Metadata["twitter"]> & {
  card: "summary_large_image";
} {
  return {
    card: "summary_large_image",
    site: "@homi_tech",
    creator: "@homi_tech",
    title: SHARE_OG_TITLE,
    description: SHARE_OG_DESCRIPTION,
    images: [SHARE_TWITTER_IMAGE],
  };
}
