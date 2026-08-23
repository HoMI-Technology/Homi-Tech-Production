/**
 * Pure JSON-LD schema builders (schema.org). Kept dependency-free of React
 * so they're trivially unit-testable — see __tests__/seo-schema.test.ts.
 *
 * Data discipline: every field here must come from real, existing content
 * (BRAND constants, actual post/guide data). Never fabricate ratings,
 * authors, or dates.
 */

import { BRAND, TAGLINES } from "@/lib/brand";

export interface OrganizationJsonLd {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  legalName: string;
  url: string;
  logo?: string;
  sameAs?: string[];
}

export function organizationJsonLd(siteUrl: string, logoPath?: string): OrganizationJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    legalName: BRAND.legalEntity,
    url: siteUrl,
    sameAs: ["https://x.com/homi_tech"],
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
  /** ISO date string ("YYYY-MM-DD") already stored with the post. Omit when
      the source data carries no real date — never invent one. */
  datePublished?: string;
  /** Site-relative path, e.g. "/blog/some-slug". */
  path: string;
}

export interface ArticleJsonLd {
  "@context": "https://schema.org";
  "@type": "Article";
  headline: string;
  description: string;
  datePublished?: string;
  mainEntityOfPage: { "@type": "WebPage"; "@id": string };
  publisher: { "@type": "Organization"; name: string; legalName: string };
}

export function articleJsonLd(input: ArticleJsonLdInput, siteUrl: string): ArticleJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}${input.path}` },
    publisher: { "@type": "Organization", name: BRAND.name, legalName: BRAND.legalEntity },
  };
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqPageJsonLd {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
}

/** FAQPage from questions already on the page. Never invent Q&As. */
export function faqPageJsonLd(faqs: readonly FaqItem[]): FaqPageJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export interface SoftwareApplicationJsonLd {
  "@context": "https://schema.org";
  "@type": "SoftwareApplication";
  name: string;
  applicationCategory: string;
  operatingSystem: string;
  url: string;
  description: string;
}

/**
 * Optional SoftwareApplication for the Decision Companion.
 * National software — no LocalBusiness, PostalAddress, telephone, or geo.
 */
export function softwareApplicationJsonLd(siteUrl: string): SoftwareApplicationJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description: TAGLINES.companion,
  };
}

export interface DefinedTermJsonLd {
  "@context": "https://schema.org";
  "@type": "DefinedTerm";
  name: string;
  description: string;
  url: string;
}

/**
 * DefinedTerm for a page that canonically defines a term the brand owns
 * (e.g. Decision Readiness Intelligence). `description` must be the real
 * definition already rendered on that page — never a marketing rewrite that
 * exists only in markup.
 */
export function definedTermJsonLd(
  input: { name: string; description: string; path: string },
  siteUrl: string,
): DefinedTermJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: input.name,
    description: input.description,
    url: `${siteUrl}${input.path}`,
  };
}
