import type { Metadata } from "next";
import { canonicalUrl, OG_DEFAULT_IMAGE, TITLE_TEMPLATE_SUFFIX } from "@/lib/seo/site";

export const NOINDEX_ROBOTS: Metadata["robots"] = { index: false, follow: false };

/**
 * Per-page title, description, canonical, and matching og:title / og:description / og:url.
 * The root layout pins the default brand share card (lib/seo/share); pages using this
 * helper replace it with their own OG. Surfaces that must keep the pinned card (the
 * homepage) spread this and re-pin openGraph/twitter with the share defaults.
 */
export function pageMetadata(opts: {
  /** Title segment (template appends ` · HōMI`) unless `absolute` is set. */
  title: string;
  description: string;
  path: string;
  /** Full <title> including ` · HōMI` — skips the layout template. */
  absolute?: boolean;
  robots?: Metadata["robots"];
}): Metadata {
  const htmlTitle = opts.absolute ? opts.title : `${opts.title}${TITLE_TEMPLATE_SUFFIX}`;
  const url = canonicalUrl(opts.path);
  const ogImage = {
    url: OG_DEFAULT_IMAGE.url,
    width: OG_DEFAULT_IMAGE.width,
    height: OG_DEFAULT_IMAGE.height,
    alt: OG_DEFAULT_IMAGE.alt,
  };

  return {
    title: opts.absolute ? { absolute: opts.title } : opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      title: htmlTitle,
      description: opts.description,
      url,
      siteName: "HōMI",
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: htmlTitle,
      description: opts.description,
      images: [{ url: OG_DEFAULT_IMAGE.url, alt: OG_DEFAULT_IMAGE.alt }],
    },
    ...(opts.robots ? { robots: opts.robots } : {}),
  };
}
