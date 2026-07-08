/**
 * Pure JSON-LD schema builders (schema.org). Kept dependency-free of React
 * so they're trivially unit-testable — see __tests__/seo-schema.test.ts.
 *
 * Data discipline: every field here must come from real, existing content
 * (BRAND constants, actual post/guide data). Never fabricate ratings,
 * authors, or dates.
 */

import { BRAND } from "@/lib/brand";

export interface OrganizationJsonLd {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  legalName: string;
  url: string;
  logo?: string;
}

export function organizationJsonLd(siteUrl: string, logoPath?: string): OrganizationJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    legalName: BRAND.legalEntity,
    url: siteUrl,
    ...(logoPath ? { logo: `${siteUrl}${logoPath}` } : {}),
  };
}

export interface WebSiteJsonLd {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  url: string;
}

export function websiteJsonLd(siteUrl: string): WebSiteJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.name,
    url: siteUrl,
  };
}

export interface ArticleJsonLdInput {
  /** Article headline — use the real page/post title, verbatim. */
  title: string;
  /** Real dek/description already shown on the page. */
  description: string;
  /** ISO date string ("YYYY-MM-DD") already stored with the post. */
  datePublished: string;
  /** Site-relative path, e.g. "/blog/some-slug". */
  path: string;
}

export interface ArticleJsonLd {
  "@context": "https://schema.org";
  "@type": "Article";
  headline: string;
  description: string;
  datePublished: string;
  mainEntityOfPage: { "@type": "WebPage"; "@id": string };
  publisher: { "@type": "Organization"; name: string; legalName: string };
}

export function articleJsonLd(input: ArticleJsonLdInput, siteUrl: string): ArticleJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    datePublished: input.datePublished,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}${input.path}` },
    publisher: { "@type": "Organization", name: BRAND.name, legalName: BRAND.legalEntity },
  };
}
