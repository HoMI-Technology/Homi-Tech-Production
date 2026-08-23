import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import sitemap from "@/app/sitemap";
import { BLOG_POSTS } from "@/components/marketing/blog-data";
import { LENSES } from "@/lib/tools/registry";
import { canonicalUrl, SITE_URL } from "@/lib/seo/site";
import { getAllPostSlugs } from "@/components/marketing/blog-data";
import { getAllGuideSlugs } from "@/components/marketing/guides-data";
import { getAllArticleSlugs } from "@/components/learning/learning-data";

const entries = sitemap();
const urls = entries.map((entry) => entry.url);

const crawlableToolPaths = LENSES.filter(
  (l) => l.path.startsWith("/tools/") && l.placement !== "redirect",
).map((l) => l.path);

describe("sitemap tool routes (registry parity)", () => {
  it("lists every crawlable /tools/* lens from the registry — no hand-copied drift", () => {
    expect(crawlableToolPaths.length).toBeGreaterThan(0);
    for (const path of crawlableToolPaths) {
      expect(urls).toContain(canonicalUrl(path));
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

  it("drops /tools/mortgage because it canonicals to /tools/affordability", () => {
    expect(urls).not.toContain(canonicalUrl("/tools/mortgage"));
    expect(urls).toContain(canonicalUrl("/tools/affordability"));
  });
});

describe("sitemap content hub (D5 consolidation)", () => {
  it("lists /guides as the single content hub; /blog and /learning indexes are delisted", () => {
    expect(urls).toContain(canonicalUrl("/guides"));
    expect(urls).not.toContain(canonicalUrl("/blog"));
    expect(urls).not.toContain(canonicalUrl("/learning"));
  });

  it("keeps every guide, blog post, and learning article reachable (no content loss)", () => {
    for (const slug of getAllGuideSlugs()) {
      expect(urls).toContain(canonicalUrl(`/guides/${slug}`));
    }
    for (const slug of getAllPostSlugs()) {
      expect(urls).toContain(canonicalUrl(`/blog/${slug}`));
    }
    for (const slug of getAllArticleSlugs()) {
      expect(urls).toContain(canonicalUrl(`/learning/${slug}`));
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

  it("lastmod only where a real stored date exists — never a new Date() per build", () => {
    const source = readFileSync(join(process.cwd(), "app", "sitemap.ts"), "utf8");
    expect(source).not.toMatch(/lastModified:\s*new Date\(\)/);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      if (entry.url.includes("/blog/")) {
        // Blog posts carry a real ISO publish date; the sitemap must emit
        // exactly that stored string, not a generated timestamp.
        const slug = entry.url.split("/blog/")[1];
        const post = BLOG_POSTS.find((p) => p.slug === slug);
        expect(post, entry.url).toBeDefined();
        expect(entry.lastModified, entry.url).toBe(post?.date);
        expect(String(entry.lastModified)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else {
        expect(entry.lastModified, entry.url).toBeUndefined();
      }
    }
  });

  it("keeps the public marketing/content set", () => {
    for (const path of [
      "/",
      "/how-it-works",
      "/first-moment",
      "/pricing",
      "/tools",
      "/legal/privacy",
      "/guides",
      "/about",
      "/method",
      "/decision-readiness-intelligence",
      "/b2b",
    ]) {
      expect(urls).toContain(canonicalUrl(path));
    }
  });

  it("homepage URL uses the live trailing-slash convention", () => {
    expect(urls).toContain("https://homitechnology.com/");
    expect(urls).not.toContain("https://homitechnology.com");
  });

  it("excludes auth-wall, non-landers, overlapping Assess, and unfinished /plan", () => {
    for (const path of [
      "/money",
      "/employee",
      "/waitlist",
      "/status",
      "/assessment",
      "/plan",
      "/advisor",
      "/decisions",
      "/genome",
      "/trinity",
      "/twin",
    ]) {
      expect(urls).not.toContain(canonicalUrl(path));
    }
  });
});
