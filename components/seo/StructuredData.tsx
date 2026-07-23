/**
 * Unified JSON-LD structured-data helper.
 *
 * Wraps the low-level <JsonLd> component with type-safe presets for
 * common HōMI page types. Data fields must come from real content —
 * never fabricate ratings, authors, or dates.
 */

import { JsonLd } from "./JsonLd";
import {
  articleJsonLd,
  organizationJsonLd,
  type ArticleJsonLdInput,
} from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/seo/site";
import { BRAND } from "@/lib/brand";

/* ─────────────────────────────────────────────────────────────────── */

export interface HowToStep {
  name: string;
  text: string;
  url?: string;
}

export interface HowToData {
  name: string;
  description: string;
  totalTime?: string; // ISO 8601 duration, e.g. "PT2M"
  steps: HowToStep[];
}

export interface SoftwareApplicationData {
  name: string;
  description: string;
  applicationCategory: string; // e.g. "FinanceApplication"
  urlPath: string;
  operatingSystem?: string;
  offers?: {
    price: string | number;
    priceCurrency: string;
  };
}

/* ─────────────────────────────────────────────────────────────────── */

function howToJsonLd(data: HowToData) {
  return {
    "@context": "https://schema.org" as const,
    "@type": "HowTo" as const,
    name: data.name,
    description: data.description,
    ...(data.totalTime ? { totalTime: data.totalTime } : {}),
    step: data.steps.map((step, index) => ({
      "@type": "HowToStep" as const,
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.url ? { url: `${SITE_URL}${step.url}` } : {}),
    })),
  };
}

function softwareApplicationJsonLd(data: SoftwareApplicationData) {
  return {
    "@context": "https://schema.org" as const,
    "@type": "SoftwareApplication" as const,
    name: data.name,
    description: data.description,
    applicationCategory: data.applicationCategory,
    operatingSystem: data.operatingSystem ?? "Any",
    url: `${SITE_URL}${data.urlPath}`,
    ...(data.offers
      ? {
          offers: {
            "@type": "Offer" as const,
            price: data.offers.price,
            priceCurrency: data.offers.priceCurrency,
          },
        }
      : {}),
    author: {
      "@type": "Organization" as const,
      name: BRAND.name,
      url: SITE_URL,
    },
  };
}

/* ─────────────────────────────────────────────────────────────────── */

type StructuredDataProps =
  | { type: "organization" }
  | { type: "howTo"; data: HowToData }
  | { type: "article"; data: ArticleJsonLdInput }
  | { type: "softwareApplication"; data: SoftwareApplicationData };

export function StructuredData(props: StructuredDataProps) {
  switch (props.type) {
    case "organization": {
      return <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />;
    }
    case "howTo": {
      return <JsonLd data={howToJsonLd(props.data)} />;
    }
    case "article": {
      return <JsonLd data={articleJsonLd(props.data, SITE_URL)} />;
    }
    case "softwareApplication": {
      return <JsonLd data={softwareApplicationJsonLd(props.data)} />;
    }
    default: {
      // Exhaustive switch — should never reach here.
      return null;
    }
  }
}
