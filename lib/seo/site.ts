/**
 * Canonical production site URL. Same value/env var used by app/layout.tsx
 * (metadataBase), app/sitemap.ts, and app/robots.ts — kept here as a single
 * reusable export so new SEO code (JSON-LD, canonicals) doesn't redefine or
 * drift from the existing fallback host.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homitechnology.com";

/** Production apex host. www traffic always folds here — never to SITE_URL (dev/preview). */
export const APEX_HOST = "homitechnology.com";
export const WWW_HOST = `www.${APEX_HOST}`;
export const APEX_ORIGIN = `https://${APEX_HOST}`;

/** Matches `title.template` in app/layout.tsx. */
export const TITLE_TEMPLATE_SUFFIX = " · HōMI";

export const X_ROBOTS_NOINDEX = "noindex";

/**
 * Default card for pageMetadata OG/Twitter tags. Single canonical asset: the
 * v5 Brand-PASSed card — the same bytes lib/seo/share.ts pins for the root
 * layout and homepage. (This default previously pointed at og-v2.)
 */
export const OG_DEFAULT_IMAGE = {
  url: "/og-v5.png",
  width: 1200,
  height: 630,
  alt: "HōMI — Will you be okay?",
} as const;

/**
 * Absolute canonical URL. Homepage keeps the live trailing slash
 * (`https://homitechnology.com/`); every other path is slash-free.
 */
export function canonicalUrl(path: string): string {
  const base = SITE_URL.replace(/\/+$/, "");
  if (path === "/" || path === "") return `${base}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized.replace(/\/+$/, "")}`;
}

/**
 * If this request Host is www.homitechnology.com, return the matching
 * https://homitechnology.com URL (path + query preserved). HTTP www must
 * not stop at https://www — protocol is forced to https on the apex.
 */
export function wwwToApexUrl(requestUrl: URL, hostHeader: string | null): URL | null {
  const host = (hostHeader ?? requestUrl.hostname).split(":")[0].toLowerCase();
  if (host !== WWW_HOST) return null;
  const next = new URL(requestUrl.toString());
  next.protocol = "https:";
  next.hostname = APEX_HOST;
  next.port = "";
  return next;
}
