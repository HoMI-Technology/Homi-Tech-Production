import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { ROBOTS_DISALLOW } from "@/app/robots";
import { LEGACY_PATH_REDIRECTS, WWW_REDIRECTS } from "@/lib/seo/redirects";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  canonicalUrl,
  TITLE_TEMPLATE_SUFFIX,
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
  it("disallows hidden labs, /money, and the existing private prefixes", () => {
    expect(ROBOTS_DISALLOW).toEqual([
      "/api/",
      "/admin",
      "/dashboard",
      "/auth/callback",
      "/advisor",
      "/decisions",
      "/genome",
      "/trinity",
      "/twin",
      "/money",
    ]);
    const doc = robots();
    const rules = Array.isArray(doc.rules) ? doc.rules : [doc.rules];
    expect(rules[0]?.disallow).toEqual([...ROBOTS_DISALLOW]);
    expect(doc.sitemap).toBe("https://homitechnology.com/sitemap.xml");
  });
});

describe("pageMetadata OG matches HTML title/meta", () => {
  it("homepage canonical is the trailing-slash live URL", () => {
    const meta = pageMetadata({
      title: "Know When You're Ready — Decision Readiness Intelligence™",
      description:
        "A credit score estimates repayment risk. HōMI helps you evaluate readiness for the decision itself — across Financial Reality, Emotional Truth, and Perfect Timing.",
      path: "/",
    });
    expect(meta.alternates?.canonical).toBe("https://homitechnology.com/");
    expect(meta.openGraph?.url).toBe("https://homitechnology.com/");
    expect(meta.openGraph?.title).toBe(
      `Know When You're Ready — Decision Readiness Intelligence™${TITLE_TEMPLATE_SUFFIX}`,
    );
    expect(meta.openGraph?.description).toBe(meta.description);
  });

  it("absolute locked titles are used for both <title> and og:title", () => {
    const meta = pageMetadata({
      title: "How it works · Three pillars, not equal · HōMI",
      description:
        "How HōMI measures readiness across Financial Reality, Emotional Truth, and Perfect Timing. A Decision Companion. Not a verdict factory.",
      path: "/how-it-works",
      absolute: true,
    });
    expect(meta.title).toEqual({ absolute: "How it works · Three pillars, not equal · HōMI" });
    expect(meta.openGraph?.title).toBe("How it works · Three pillars, not equal · HōMI");
    expect(meta.openGraph?.url).toBe("https://homitechnology.com/how-it-works");
    expect(meta.openGraph?.description).toBe(meta.description);
  });
});

describe("locked title/meta lines", () => {
  it("keeps the homepage title and meta", () => {
    const page = src("app", "(marketing)", "page.tsx");
    expect(page).toContain('title: "Know When You\'re Ready — Decision Readiness Intelligence™"');
    expect(page).toContain(
      "A credit score estimates repayment risk. HōMI helps you evaluate readiness for the decision itself — across Financial Reality, Emotional Truth, and Perfect Timing.",
    );
  });

  it("locks /how-it-works title and meta", () => {
    const page = src("app", "(marketing)", "how-it-works", "page.tsx");
    expect(page).toContain('title: "How it works · Three pillars, not equal · HōMI"');
    expect(page).toContain(
      "How HōMI measures readiness across Financial Reality, Emotional Truth, and Perfect Timing. A Decision Companion. Not a verdict factory.",
    );
    expect(page).not.toContain("Palm Springs");
  });

  it("locks /first-moment title and meta", () => {
    const page = src("app", "(marketing)", "first-moment", "page.tsx");
    expect(page).toContain('title: "Will you be okay? · Assess · HōMI"');
    expect(page).toContain(
      "Five quiet beats, then an account, then the full assessment, so the verdict stays yours. Everyone else tells you how. HōMI tells you if.",
    );
    expect(page).not.toContain("Everyone else tells you if.");
  });

  it("keeps /pricing and /tools titles and does not say 18 calculators", () => {
    const pricing = src("app", "(marketing)", "pricing", "page.tsx");
    const tools = src("app", "(product)", "tools", "page.tsx");
    expect(pricing).toContain('title: "Pricing"');
    expect(pricing).toContain("faqPageJsonLd(FAQS)");
    expect(tools).toContain('title: "Tools"');
    expect(tools).toContain(
      "Honest lenses for the math behind your biggest decisions — housing, debt, and independence.",
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
});

const BANNED_CREDIT_COPY = [/replaces the credit score/i, /outdated credit score/i] as const;

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
      for (const banned of BANNED_CREDIT_COPY) {
        expect(text, `${rel} must not contain ${banned}`).not.toMatch(banned);
      }
    }
  });

  it("does not add LocalBusiness, town, or house-only SKU fields in those files", () => {
    for (const rel of SEO_AND_TOUCHED_METADATA) {
      const text = src(...rel.split("/"));
      expect(text, rel).not.toMatch(/"@type":\s*"LocalBusiness"/);
      expect(text, rel).not.toMatch(/"@type":\s*"PostalAddress"/);
      expect(text, rel).not.toMatch(/Palm Springs/i);
    }
  });
});
