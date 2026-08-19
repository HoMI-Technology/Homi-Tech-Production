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

const MOUNTS = [
  ["app/(marketing)/layout.tsx", src("app", "(marketing)", "layout.tsx")],
  ["app/(product)/layout.tsx", src("app", "(product)", "layout.tsx")],
  ["app/not-found.tsx", src("app", "not-found.tsx")],
  ["app/share/[token]/page.tsx", src("app", "share", "[token]", "page.tsx")],
] as const;

describe("quiet home footer — sitewide SiteFooter cut", () => {
  const quiet = src("components", "layout", "QuietHomeFooter.tsx");
  const shell = src("components", "layout", "SiteFooter.tsx");
  const mounted = `${shell}\n${quiet}`;

  it("SiteFooter always mounts QuietHomeFooter and never SitemapFooter", () => {
    expect(shell).toContain("<QuietHomeFooter");
    expect(shell).not.toContain("<SitemapFooter");
    expect(shell).not.toMatch(/from ["']@\/components\/layout\/SitemapFooter["']/);
    expect(shell).not.toContain("SiteFooterSwitch");
    expect(shell).not.toContain("usePathname");
    expect(shell).not.toContain('pathname === "/"');
  });

  it.each(MOUNTS)("%s mounts SiteFooter, not a sitemap cut", (_rel, text) => {
    expect(text).toContain("<SiteFooter");
    expect(text).not.toContain("SitemapFooter");
  });

  it("legal row is Privacy · Terms · Cookies · Support · Waitlist", () => {
    expect(quiet).toContain('{ href: "/legal/privacy", label: "Privacy" }');
    expect(quiet).toContain('{ href: "/legal/terms", label: "Terms" }');
    expect(quiet).toContain('{ href: "/legal/cookies", label: "Cookies" }');
    expect(quiet).toContain('{ href: "mailto:support@homitechnology.com", label: "Support" }');
    expect(quiet).toContain('{ href: "/waitlist", label: "Waitlist" }');
    const privacy = quiet.indexOf('label: "Privacy"');
    const terms = quiet.indexOf('label: "Terms"');
    const cookies = quiet.indexOf('label: "Cookies"');
    const support = quiet.indexOf('label: "Support"');
    const waitlist = quiet.indexOf('href: "/waitlist", label: "Waitlist"');
    expect(privacy).toBeGreaterThan(-1);
    expect(terms).toBeGreaterThan(privacy);
    expect(cookies).toBeGreaterThan(terms);
    expect(support).toBeGreaterThan(cookies);
    expect(waitlist).toBeGreaterThan(support);
  });

  it("quiet cut pins exact socials as equal text links", () => {
    expect(quiet).toContain(TIKTOK);
    expect(quiet).toContain(X);
    expect(quiet).toMatch(/>\s*X\s*</);
    expect(quiet).toMatch(/>\s*TikTok\s*</);
    expect(quiet).toContain('aria-label="HōMI on X (opens in a new tab)"');
    expect(quiet).toContain('aria-label="HōMI on TikTok (opens in a new tab)"');
    expect(quiet).toContain('target="_blank"');
    expect(quiet).toContain('rel="noopener noreferrer"');
  });

  it("mounted footer forbids sitemap columns, X SVG, legal wall, and DRI pipe", () => {
    expect(mounted).not.toContain("<svg");
    expect(mounted).not.toContain('title: "Product"');
    expect(mounted).not.toContain('title: "Learn"');
    expect(mounted).not.toContain('title: "For Teams"');
    expect(mounted).not.toContain('title: "Legal"');
    expect(mounted).not.toContain("Cookie policy");
    expect(mounted).not.toContain("LEGAL_DISCLAIMER");
    expect(mounted).not.toContain("A Decision Companion. Financial Reality");
    expect(mounted).not.toContain("Decision Readiness Intelligence");
    expect(mounted).not.toContain("Decision Readiness Intelligence™");
    expect(quiet).toContain('label: "Cookies"');
    expect(quiet).toContain("{TAGLINES.primary}");
    expect(TAGLINES.primary).toBe("Know when you're ready. Move when it matters.");
  });
});
