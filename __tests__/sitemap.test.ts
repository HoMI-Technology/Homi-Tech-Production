import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import { LENSES } from "@/lib/tools/registry";
import { SITE_URL } from "@/lib/seo/site";
import { getAllPostSlugs } from "@/components/marketing/blog-data";
import { getAllGuideSlugs } from "@/components/marketing/guides-data";
import { getAllArticleSlugs } from "@/components/learning/learning-data";

const urls = sitemap().map((entry) => entry.url);

describe("sitemap tool routes (registry parity)", () => {
  it("lists every /tools/* lens from the registry — no hand-copied drift", () => {
    const registryToolPaths = LENSES.map((l) => l.path).filter((p) => p.startsWith("/tools/"));
    expect(registryToolPaths.length).toBeGreaterThan(0);
    for (const path of registryToolPaths) {
      expect(urls).toContain(`${SITE_URL}${path}`);
    }
  });

  it("lists no /tools/* page that the registry does not know about", () => {
    const registryToolPaths = new Set(
      LENSES.map((l) => l.path).filter((p) => p.startsWith("/tools/")),
    );
    const sitemapToolPaths = urls
      .filter((u) => u.startsWith(`${SITE_URL}/tools/`))
      .map((u) => u.slice(SITE_URL.length));
    for (const path of sitemapToolPaths) {
      expect(registryToolPaths.has(path)).toBe(true);
    }
  });
});

describe("sitemap content hub (D5 consolidation)", () => {
  it("lists /guides as the single content hub; /blog and /learning indexes are delisted", () => {
    expect(urls).toContain(`${SITE_URL}/guides`);
    expect(urls).not.toContain(`${SITE_URL}/blog`);
    expect(urls).not.toContain(`${SITE_URL}/learning`);
  });

  it("keeps every guide, blog post, and learning article reachable (no content loss)", () => {
    for (const slug of getAllGuideSlugs()) {
      expect(urls).toContain(`${SITE_URL}/guides/${slug}`);
    }
    for (const slug of getAllPostSlugs()) {
      expect(urls).toContain(`${SITE_URL}/blog/${slug}`);
    }
    for (const slug of getAllArticleSlugs()) {
      expect(urls).toContain(`${SITE_URL}/learning/${slug}`);
    }
  });

  it("has no slug collisions across guides, blog, and learning", () => {
    const all = [...getAllGuideSlugs(), ...getAllPostSlugs(), ...getAllArticleSlugs()];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("sitemap hygiene", () => {
  it("contains no duplicate URLs", () => {
    expect(new Set(urls).size).toBe(urls.length);
  });
});
