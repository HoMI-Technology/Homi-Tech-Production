import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import sitemap from "@/app/sitemap";
import { canonicalUrl } from "@/lib/seo/site";

const entries = sitemap();
const urls = entries.map((entry) => entry.url);

describe("sitemap PR15 KEEP set", () => {
  it("lists only landing, waitlist, and KEEP legal", () => {
    expect(urls).toEqual([
      canonicalUrl("/"),
      canonicalUrl("/waitlist"),
      canonicalUrl("/legal/privacy"),
      canonicalUrl("/legal/terms"),
      canonicalUrl("/legal/cookies"),
    ]);
  });

  it("does not list scratched product or extra marketing URLs", () => {
    for (const path of [
      "/dashboard",
      "/assessment",
      "/first-moment",
      "/how-it-works",
      "/pricing",
      "/tools",
      "/tools/affordability",
      "/guides",
      "/blog",
      "/learning",
      "/about",
      "/method",
      "/shadow-score",
      "/legal/disclaimer",
      "/legal/subprocessors",
    ]) {
      expect(urls).not.toContain(canonicalUrl(path));
    }
  });
});

describe("sitemap hygiene", () => {
  it("contains no duplicate URLs", () => {
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("lastmod is omitted on KEEP entries — never a new Date() per build", () => {
    const source = readFileSync(join(process.cwd(), "app", "sitemap.ts"), "utf8");
    expect(source).not.toMatch(/lastModified:\s*new Date\(\)/);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.lastModified, entry.url).toBeUndefined();
    }
  });

  it("homepage URL uses the live trailing-slash convention", () => {
    expect(urls).toContain("https://homitechnology.com/");
    expect(urls).not.toContain("https://homitechnology.com");
  });
});
