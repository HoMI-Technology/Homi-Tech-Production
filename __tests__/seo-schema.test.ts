import { describe, it, expect } from "vitest";
import {
  organizationJsonLd,
  websiteJsonLd,
  articleJsonLd,
  faqPageJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/seo/schema";
import { BRAND, TAGLINES } from "@/lib/brand";

const SITE = "https://homitechnology.com";

describe("organizationJsonLd", () => {
  it("uses real brand name and legal entity, no fabricated fields", () => {
    const data = organizationJsonLd(SITE);
    expect(data["@type"]).toBe("Organization");
    expect(data.name).toBe(BRAND.name);
    expect(data.legalName).toBe(BRAND.legalEntity);
    expect(data.url).toBe(SITE);
    expect(data.logo).toBeUndefined();
    expect(data).not.toHaveProperty("address");
    expect(data).not.toHaveProperty("telephone");
    expect(data).not.toHaveProperty("geo");
    expect(JSON.stringify(data)).not.toContain("LocalBusiness");
    expect(JSON.stringify(data)).not.toContain("PostalAddress");
  });

  it("resolves logo against the site URL when a path is given", () => {
    const data = organizationJsonLd(SITE, "/icon-512-v2.png");
    expect(data.logo).toBe(`${SITE}/icon-512-v2.png`);
  });
});

describe("websiteJsonLd", () => {
  it("returns name + url only", () => {
    const data = websiteJsonLd(SITE);
    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: BRAND.name,
      url: SITE,
    });
  });
});

describe("articleJsonLd", () => {
  it("maps real post data without inventing an author or rating", () => {
    const data = articleJsonLd(
      {
        title: "Why We Built the Platform That Says Not Yet",
        description: "Some real description.",
        datePublished: "2026-06-24",
        path: "/blog/why-we-built-the-platform-that-says-not-yet",
      },
      SITE,
    );

    expect(data["@type"]).toBe("Article");
    expect(data.headline).toBe("Why We Built the Platform That Says Not Yet");
    expect(data.datePublished).toBe("2026-06-24");
    expect(data.mainEntityOfPage).toEqual({
      "@type": "WebPage",
      "@id": `${SITE}/blog/why-we-built-the-platform-that-says-not-yet`,
    });
    expect(data.publisher).toEqual({
      "@type": "Organization",
      name: BRAND.name,
      legalName: BRAND.legalEntity,
    });
    expect("author" in data).toBe(false);
  });
});

describe("faqPageJsonLd", () => {
  it("maps the provided Q&As without inventing extras", () => {
    const faqs = [{ q: "Can I cancel anytime?", a: "Yes." }];
    const data = faqPageJsonLd(faqs);
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toHaveLength(1);
    expect(data.mainEntity[0]?.name).toBe("Can I cancel anytime?");
    expect(data.mainEntity[0]?.acceptedAnswer.text).toBe("Yes.");
  });
});

describe("softwareApplicationJsonLd", () => {
  it("names HōMI as a Decision Companion with no local fields", () => {
    const data = softwareApplicationJsonLd(SITE);
    expect(data["@type"]).toBe("SoftwareApplication");
    expect(data.name).toBe(BRAND.name);
    expect(data.name).toBe("HōMI");
    expect(data.name).not.toMatch(/Decision Readiness Intelligence/);
    expect(data.name).not.toMatch(/DRI/);
    expect(data.name).not.toMatch(/replaces/i);
    expect(data.name).not.toMatch(/outdated credit score/i);
    expect(data.url).toBe(SITE);
    expect(data.description).toBe(TAGLINES.companion);
    expect(data.description).not.toContain(BRAND.category);
    expect(data.description).not.toMatch(/Decision Readiness Intelligence/);
    expect(data).not.toHaveProperty("address");
    expect(data).not.toHaveProperty("telephone");
    expect(data).not.toHaveProperty("geo");
    expect(JSON.stringify(data)).not.toMatch(/LocalBusiness|PostalAddress/);
  });
});
