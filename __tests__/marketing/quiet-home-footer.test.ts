import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TAGLINES } from "@/lib/brand";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

const TIKTOK = "https://www.tiktok.com/@homi_technology";
const X = "https://x.com/homi_tech";

describe("quiet home footer — `/` cut vs sitemap", () => {
  const quiet = src("components", "layout", "QuietHomeFooter.tsx");
  const sitemap = src("components", "layout", "SitemapFooter.tsx");
  const gate = src("components", "layout", "SiteFooterSwitch.tsx");
  const shell = src("components", "layout", "SiteFooter.tsx");

  it("gates the quiet cut on pathname `/` only", () => {
    expect(gate).toContain("usePathname");
    expect(gate).toContain('pathname === "/"');
    expect(shell).toContain("<QuietHomeFooter");
    expect(shell).toContain("<SitemapFooter");
  });

  it("home cut pins exact socials as equal text links", () => {
    expect(quiet).toContain(TIKTOK);
    expect(quiet).toContain(X);
    expect(quiet).toMatch(/>\s*X\s*</);
    expect(quiet).toMatch(/>\s*TikTok\s*</);
    expect(quiet).not.toContain("<svg");
    expect(quiet).toContain('aria-label="HōMI on X (opens in a new tab)"');
    expect(quiet).toContain('aria-label="HōMI on TikTok (opens in a new tab)"');
  });

  it("home cut has no sitemap column titles or long legal wall", () => {
    expect(quiet).not.toContain('title: "Product"');
    expect(quiet).not.toContain('title: "Learn"');
    expect(quiet).not.toContain('title: "For Teams"');
    expect(quiet).not.toContain('title: "Legal"');
    expect(quiet).not.toContain("Cookie policy");
    expect(quiet).toContain('label: "Cookies"');
    expect(quiet).toContain("{TAGLINES.primary}");
    expect(TAGLINES.primary).toBe("Know when you're ready. Move when it matters.");
    expect(quiet).not.toContain("A Decision Companion. Financial Reality");
  });

  it("other routes keep the five-column sitemap and #260 TikTok href", () => {
    expect(sitemap).toContain('title: "Product"');
    expect(sitemap).toContain('title: "Learn"');
    expect(sitemap).toContain('title: "For Teams"');
    expect(sitemap).toContain('title: "Legal"');
    expect(sitemap).toContain(TIKTOK);
    expect(sitemap).toContain(X);
    expect(sitemap).toContain("{LEGAL_DISCLAIMER}");
    expect(sitemap).toContain("Decision Readiness Intelligence™");
  });
});
