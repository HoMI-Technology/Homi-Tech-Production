import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { ROBOTS_DISALLOW } from "@/app/robots";
import { LEGACY_PATH_REDIRECTS, WWW_REDIRECTS } from "@/lib/seo/redirects";
import { PROTECTED_PREFIXES } from "@/lib/auth/protected-routes";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  canonicalUrl,
  WWW_HOST,
  APEX_ORIGIN,
  wwwToApexUrl,
} from "@/lib/seo/site";
import { SHADOW_READ_KICKER, SHADOW_READ_TITLE } from "@/lib/assessment/shadow-read";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

describe("canonicalUrl", () => {
  it("uses a trailing slash on the homepage and nowhere else", () => {
    expect(canonicalUrl("/")).toBe("https://homitechnology.com/");
    expect(canonicalUrl("/how-it-works")).toBe("https://homitechnology.com/how-it-works");
    expect(canonicalUrl("/how-it-works/")).toBe("https://homitechnology.com/how-it-works");
  });
});

describe("wwwToApexUrl", () => {
  it("rewrites HTTP www to https apex in one hop", () => {
    const next = wwwToApexUrl(
      new URL("http://www.homitechnology.com/how-it-works"),
      "www.homitechnology.com",
    );
    expect(next?.toString()).toBe("https://homitechnology.com/how-it-works");
  });

  it("leaves non-www hosts alone", () => {
    expect(
      wwwToApexUrl(new URL("https://homitechnology.com/pricing"), "homitechnology.com"),
    ).toBeNull();
    expect(wwwToApexUrl(new URL("http://localhost:3000/"), "localhost:3000")).toBeNull();
  });
});

describe("legacy path redirects", () => {
  it("permanently folds the three retired public URLs", () => {
    expect(LEGACY_PATH_REDIRECTS).toEqual([
      { source: "/privacy", destination: "/legal/privacy", permanent: true },
      { source: "/subprocessors", destination: "/legal/subprocessors", permanent: true },
      { source: "/assess/new", destination: "/first-moment", permanent: true },
    ]);
  });

  it("is wired into next.config.ts", () => {
    const config = src("next.config.ts");
    expect(config).toContain("LEGACY_PATH_REDIRECTS");
    expect(config).toContain("WWW_REDIRECTS");
    expect(config).toContain('source: "/auth/sign-in"');
    expect(config).toContain("X-Robots-Tag");
  });
});

describe("www redirects (next.config)", () => {
  it("sends every www host match to https apex, including the homepage slash", () => {
    expect(WWW_REDIRECTS[0]).toMatchObject({
      source: "/",
      destination: `${APEX_ORIGIN}/`,
      permanent: true,
    });
    expect(WWW_REDIRECTS[0]?.has).toEqual([{ type: "host", value: WWW_HOST }]);
    expect(WWW_REDIRECTS[1]).toMatchObject({
      source: "/:path*",
      destination: `${APEX_ORIGIN}/:path*`,
      permanent: true,
    });
  });
});

describe("robots.txt crawl control", () => {
  it("disallows /api, the auth callback, and every protected product prefix", () => {
    // Derived from the middleware SSOT - a newly protected route is
    // automatically disallowed; a hand-copied list here would just re-drift.
    expect(ROBOTS_DISALLOW).toEqual(["/api/", "/auth/callback", ...PROTECTED_PREFIXES]);
    // Public product surfaces must stay crawlable (and /plan keeps its
    // metadata noindex visible to crawlers instead of a robots block).
    for (const open of ["/tools", "/scenarios", "/shadow-score", "/assessment", "/plan", "/path"]) {
      expect(ROBOTS_DISALLOW).not.toContain(open);
    }
    const doc = robots();
    const rules = Array.isArray(doc.rules) ? doc.rules : [doc.rules];
    expect(rules[0]?.disallow).toEqual([...ROBOTS_DISALLOW]);
    expect(doc.sitemap).toBe("https://homitechnology.com/sitemap.xml");
  });
});

describe("pageMetadata OG matches HTML title/meta", () => {
  it("homepage canonical is the trailing-slash live URL and title does not lead with the tagline", () => {
    const title = "Decision Readiness Intelligence · A Decision Companion · HōMI";
    const meta = pageMetadata({
      title,
      description:
        "A credit score estimates repayment risk. HōMI helps you evaluate readiness for the decision itself — across Financial Reality, Emotional Truth, and Perfect Timing.",
      path: "/",
      absolute: true,
    });
    expect(meta.alternates?.canonical).toBe("https://homitechnology.com/");
    expect(meta.openGraph?.url).toBe("https://homitechnology.com/");
    expect(meta.title).toEqual({ absolute: title });
    expect(meta.openGraph?.title).toBe(title);
    expect(meta.openGraph?.description).toBe(meta.description);
    expect(String(meta.openGraph?.title)).not.toMatch(/^Know When You're Ready/i);
  });

  it("absolute locked titles are used for both <title> and og:title", () => {
    const locked: [string, string][] = [
      ["/", "Decision Readiness Intelligence · A Decision Companion · HōMI"],
      ["/how-it-works", "How it works · HōMI"],
      ["/pricing", "Pricing · HōMI"],
      ["/first-moment", "First Moment · HōMI"],
    ];
    for (const [path, title] of locked) {
      const meta = pageMetadata({
        title,
        description: "x",
        path,
        absolute: true,
      });
      expect(meta.title).toEqual({ absolute: title });
      expect(meta.openGraph?.title).toBe(title);
    }
  });
});

describe("locked title/meta lines", () => {
  it("pins the four Tech SEO titles exactly", () => {
    const titles: [string[], string][] = [
      [["app", "(marketing)", "page.tsx"], "Decision Readiness Intelligence · A Decision Companion · HōMI"],
      [["app", "(marketing)", "how-it-works", "page.tsx"], "How it works · HōMI"],
      [["app", "(marketing)", "pricing", "page.tsx"], "Pricing · HōMI"],
      [["app", "(marketing)", "first-moment", "page.tsx"], "First Moment · HōMI"],
    ];
    for (const [segments, title] of titles) {
      expect(src(...segments)).toContain(`title: "${title}"`);
      expect(src(...segments)).toContain("absolute: true");
    }
  });
  it("locks the homepage title to Decision Readiness and keeps the live meta", () => {
    const page = src("app", "(marketing)", "page.tsx");
    expect(page).toContain('title: "Decision Readiness Intelligence · A Decision Companion · HōMI"');
    expect(page).toContain("absolute: true");
    expect(page).not.toContain("Know When You're Ready — Decision Readiness Intelligence™");
    expect(page).not.toMatch(/title: "Know When You're Ready/);
    expect(page).toContain(
      "A credit score estimates repayment risk. HōMI helps you evaluate readiness for the decision itself — across Financial Reality, Emotional Truth, and Perfect Timing.",
    );
    expect(page).not.toMatch(/DIOS|decision-intelligence|Decision Intelligence OS/i);
  });

  it("locks /how-it-works title and meta — body lock stays, title is not the pillars line", () => {
    const page = src("app", "(marketing)", "how-it-works", "page.tsx");
    expect(page).toContain('title: "How it works · HōMI"');
    expect(page).toContain("absolute: true");
    expect(page).not.toContain('title: "HōMI Score · How it works · HōMI"');
    expect(page).not.toContain('title: "How it works · Three pillars, not equal · HōMI"');
    expect(page).toContain(
      "How HōMI measures readiness across Financial Reality, Emotional Truth, and Perfect Timing. A Decision Companion. Not a verdict factory.",
    );
    expect(page).toContain(
      "Three pillars, weighed differently — how they combine stays ours. No single pillar",
    );
    expect(page).not.toContain("Palm Springs");
  });

  it("locks /first-moment to a non-ranking title — not Assess, not Will you be okay?", () => {
    const page = src("app", "(marketing)", "first-moment", "page.tsx");
    expect(page).toContain('title: "First Moment · HōMI"');
    expect(page).toContain("absolute: true");
    expect(page).not.toMatch(/title: "Will you be okay\?/);
    expect(page).not.toContain('title: "Will you be okay? · Assess · HōMI"');
    expect(page).not.toContain('title: "Assess · HōMI"');
    expect(page).not.toMatch(/title: "[^"]*Assess[^"]*"/);
    expect(page).toContain(
      "Five quiet beats, then an account, then the full assessment, so the verdict stays yours. Everyone else tells you how. HōMI tells you if.",
    );
    expect(page).not.toContain("Everyone else tells you if.");
  });

  it("locks /pricing title and keeps /tools copy; does not say 18 calculators", () => {
    const pricing = src("app", "(marketing)", "pricing", "page.tsx");
    const tools = src("app", "(product)", "tools", "page.tsx");
    expect(pricing).toContain('title: "Pricing · HōMI"');
    expect(pricing).not.toContain('title: "HōMI Pricing · HōMI"');
    expect(pricing).toContain("absolute: true");
    expect(pricing).toContain("faqPageJsonLd(FAQS)");
    expect(tools).toContain('title: "Tools"');
    expect(tools).toContain(
      "Answer one math question at a time — honest educational lenses. Estimates never write your official score.",
    );
    expect(tools).not.toMatch(/18 calculators/i);
    expect(pricing).not.toMatch(/18 calculators/i);
  });

  it("keeps /shadow-score as a 90-second educational read, not a verdict", () => {
    expect(SHADOW_READ_TITLE).toBe("90-second read");
    expect(SHADOW_READ_KICKER).toBe("Educational. Not a verdict.");
    const page = src("app", "(product)", "shadow-score", "page.tsx");
    expect(page).toContain("SHADOW_READ_TITLE");
    expect(page).toContain("SHADOW_READ_KICKER");
  });
});

describe("noindex surfaces", () => {
  it("noindexes /auth/sign-in in HTML metadata", () => {
    const layout = src("app", "auth", "sign-in", "layout.tsx");
    expect(layout).toContain("NOINDEX_ROBOTS");
    expect(layout).toContain("robots:");
  });

  it("noindexes /plan without writing a ranking title", () => {
    const layout = src("app", "(product)", "plan", "layout.tsx");
    expect(layout).toContain("NOINDEX_ROBOTS");
    expect(layout).not.toMatch(/title:\s*["']/);
    expect(src("app", "sitemap.ts")).not.toContain('"/plan"');
  });
});

describe("root layout does not pin a site-wide OG title", () => {
  it("leaves og:title / og:description to the page", () => {
    const layout = src("app", "layout.tsx");
    expect(layout).not.toContain("openGraph: {\n    title:");
    expect(layout).not.toContain("Readiness, not eligibility.");
  });

  it("does not pin home-buying as the company category", () => {
    const layout = src("app", "layout.tsx");
    expect(layout).not.toContain("home buying readiness");
    expect(layout).toContain('"decision readiness"');
    expect(layout).toContain('"decision companion"');
  });

  it("default title is HōMI and does not lead with DRI or the tagline", () => {
    const layout = src("app", "layout.tsx");
    expect(layout).toContain('default: "HōMI"');
    expect(layout).toContain('description: "A Decision Companion."');
    expect(layout).not.toContain('default: "HōMI · Decision Readiness Intelligence™"');
    expect(layout).not.toMatch(/default: "[^"]*Know When You're Ready/);
    expect(layout).not.toMatch(/description:\s*"[^"]*Know When You're Ready/);
    expect(layout).not.toMatch(/description:\s*"[^"]*Decision Readiness Intelligence/);
    expect(layout).not.toMatch(/\bDIOS\b|decision-intelligence|Decision Intelligence OS/i);
  });
});

const BANNED_SEO_COPY = [
  /replaces the credit score/i,
  /outdated credit score/i,
  /\bDIOS\b/,
  /decision-intelligence/i,
  /Decision Intelligence OS/i,
] as const;

/** lib/seo/* plus the marketing/metadata files this PR already touched. */
const SEO_AND_TOUCHED_METADATA = [
  "lib/seo/site.ts",
  "lib/seo/metadata.ts",
  "lib/seo/schema.ts",
  "lib/seo/redirects.ts",
  "app/layout.tsx",
  "app/(marketing)/page.tsx",
  "app/(marketing)/how-it-works/page.tsx",
  "app/(marketing)/first-moment/page.tsx",
  "app/(marketing)/pricing/page.tsx",
  "app/(marketing)/about/page.tsx",
  "app/(marketing)/method/page.tsx",
  "app/(marketing)/b2b/page.tsx",
  "app/(marketing)/partner/page.tsx",
  "app/(marketing)/guides/page.tsx",
  "app/(marketing)/guides/hard-stops/page.tsx",
  "app/(marketing)/guides/[slug]/page.tsx",
  "app/(marketing)/blog/[slug]/page.tsx",
  "app/(marketing)/learning/[slug]/page.tsx",
  "app/(marketing)/legal/privacy/page.tsx",
  "app/(marketing)/legal/terms/page.tsx",
  "app/(marketing)/legal/disclaimer/page.tsx",
  "app/(marketing)/legal/acceptable-use/page.tsx",
  "app/(marketing)/legal/cookies/page.tsx",
  "app/(marketing)/legal/dmca/page.tsx",
  "app/(marketing)/legal/subprocessors/page.tsx",
  "app/(product)/tools/page.tsx",
  "app/(product)/shadow-score/page.tsx",
] as const;

describe("credit-score copy stays the live homepage line — never a replacement claim", () => {
  it("keeps the live homepage repayment-risk sentence", () => {
    expect(src("app", "(marketing)", "page.tsx")).toContain(
      "A credit score estimates repayment risk. HōMI helps you evaluate readiness for the decision itself — across Financial Reality, Emotional Truth, and Perfect Timing.",
    );
  });

  it("never writes replacement or outdated-credit-score copy in SEO or touched metadata", () => {
    for (const rel of SEO_AND_TOUCHED_METADATA) {
      const text = src(...rel.split("/"));
      for (const banned of BANNED_SEO_COPY) {
        expect(text, `${rel} must not contain ${banned}`).not.toMatch(banned);
      }
    }
  });

  it("does not add LocalBusiness, town, or house-only SKU fields in those files", () => {
    for (const rel of SEO_AND_TOUCHED_METADATA) {
      const text = src(...rel.split("/"));
      expect(text, rel).not.toMatch(/"@type":\s*"LocalBusiness"/);
      expect(text, rel).not.toMatch(/"@type":\s*"PostalAddress"/);
      // Legal contact copy may name the Florida mailing address. That is not
      // LocalBusiness / house-SKU schema and must stay off marketing metadata.
      if (!rel.startsWith("app/(marketing)/legal/")) {
        expect(text, rel).not.toMatch(/Palm Springs/i);
      }
    }
  });
});
