import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TAGLINES } from "@/lib/brand";
import { FIRST_MOMENT_BEATS } from "@/components/marketing/first-moment-copy";
import {
  WALK_CLARITY,
  WALK_COMPANION,
  WALK_INVERSION,
  WALK_LINES,
  WALK_OBJECT,
  WALK_PRIMARY,
  WALK_QUESTION,
  WALK_NOT_YET,
} from "@/components/home/walk-copy";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

const HOME = src("app", "(marketing)", "page.tsx");
const HERO = src("components", "home", "InterviewHero.tsx");

describe("homepage front door — locked copy is character-exact", () => {
  it("pins the seven locked lines and invents no others", () => {
    expect(WALK_LINES).toEqual([
      "Will you be okay?",
      "A Decision Companion.",
      "Everyone else tells you how. HōMI tells you if.",
      "Know when you're ready. Move when it matters.",
      "Clarity, not commission.",
      "Not yet is not no.",
      "The compass that becomes a key when you're finally ready to turn it.",
    ]);
    expect(WALK_PRIMARY).toBe(TAGLINES.primary);
    expect(WALK_QUESTION).toBe("Will you be okay?");
    expect(WALK_COMPANION).toBe("A Decision Companion.");
    expect(TAGLINES.companion).toBe("A Decision Companion");
    expect(WALK_COMPANION).not.toBe(TAGLINES.companion);
    expect(WALK_INVERSION).toBe("Everyone else tells you how. HōMI tells you if.");
    expect(WALK_CLARITY).toBe("Clarity, not commission.");
    expect(WALK_NOT_YET).toBe("Not yet is not no.");
    expect(WALK_OBJECT).toBe(
      "The compass that becomes a key when you're finally ready to turn it.",
    );
  });

  it("mounts every locked line and does not paste First Moment beats", () => {
    expect(HERO).toContain("WALK_QUESTION");
    expect(HERO).toContain("WALK_INVERSION");
    expect(HERO).not.toContain("WALK_OBJECT");
    expect(HOME).toContain("WALK_COMPANION");
    expect(HOME).toContain("WALK_PRIMARY");
    expect(HOME).toContain("WALK_CLARITY");
    expect(HOME).toContain("WALK_OBJECT");
    expect(HOME).toContain("Not yet is not");
    expect(HOME).toContain('className="text-emerald"');
    expect(HOME).not.toContain("WALK_INVERSION");
    expect(HOME).toContain("softwareApplicationJsonLd");
    expect(HOME).toContain("organizationJsonLd");
    expect(HOME).toContain("websiteJsonLd");
    for (const beat of FIRST_MOMENT_BEATS) {
      expect(HOME).not.toContain(beat.line);
      expect(HERO).not.toContain(beat.line);
    }
  });
});

describe("homepage front door — first viewport", () => {
  it("paints the H1 at opacity 1 with text-wrap balance — never opacity 0", () => {
    expect(HERO).toContain("type-giant");
    expect(HERO).toContain("{WALK_QUESTION}");
    expect(HERO).toContain("text-ink");
    expect(HERO).toContain('textWrap: "balance"');
    expect(HERO).toContain("opacity: 1");
    expect(HERO).not.toContain("opacity-0");
    expect(HERO).not.toContain("opacity: 0");
    expect(HERO).not.toMatch(/typewriter|split-type|SplitType/i);
    expect(HERO).not.toContain("WalkWords");
    expect(HERO).not.toContain("HoldStage");
    expect((HERO.match(/<h1[\s>]/g) ?? []).length).toBe(1);
  });

  it("puts the inversion on the first viewport, readable without scroll", () => {
    expect(HERO).toContain("{WALK_INVERSION}");
    expect(HERO).toContain("type-h2");
    const mark = HERO.indexOf("{WALK_INVERSION}");
    const inversion = HERO.slice(Math.max(0, mark - 220), mark);
    expect(inversion).toContain("opacity: 1");
    expect(inversion).toContain('textWrap: "balance"');
  });

  it("is a finished front door — no sticky 100vh walk theater", () => {
    expect(HOME).not.toContain("WalkPersist");
    expect(HOME).not.toContain("WalkBeat");
    expect(HOME).not.toContain("HoldStage");
    expect(HOME).not.toContain("WalkWords");
    expect(HERO).not.toContain("HoldStage");
    expect(HERO).not.toContain("walk-hold");
    expect(HERO).not.toContain("h-[100dvh]");
    expect(HOME).not.toContain("walk-when");
    expect(HOME).not.toContain('href="/walk"');
  });

  it("sits one Assess under the H1 and does not travel over later type", () => {
    expect(HERO).toContain("PRIMARY_CLOSE_HREF");
    expect(HERO).toContain("PRIMARY_CLOSE_LABEL");
    expect(HERO).toContain("?src=hero");
    expect(HERO).toContain('track("hero_cta_click", { src: "hero" })');
    expect((HERO.match(/btn-primary/g) ?? []).length).toBe(1);
    expect(HOME).not.toContain("btn-primary");
    expect(HOME).not.toContain("PRIMARY_CLOSE");
    expect(HERO).not.toContain("walk-travel-assess");
    expect(HOME).not.toContain("walk-travel-assess");
    expect(HERO).not.toMatch(/lg:grid-cols/);
    expect(HERO).not.toContain("object-hero");
  });

  it("mounts the Brand compass at hero scale, not a corner sticker", () => {
    expect(HERO).toContain("Compass3D");
    expect(HERO).toContain("data-hero-compass");
    expect(HERO).toContain("keyholePulse={false}");
    expect(HERO).toContain("md:w-[min(68vmin,38rem)]");
    expect(HERO).not.toContain("9.25rem");
    expect(HERO).not.toContain("26vmin");
    expect(HERO).not.toContain("COMPASS_FIELD");
    expect(HERO).not.toContain("hero-instrument-field");
    expect(HERO).not.toContain('verdict="READY"');
    expect(HERO).not.toContain("Particles");
    expect(HOME).not.toContain("Particles");
    expect(HOME).not.toContain("CinematicCompass");
    expect(HOME).not.toContain("Compass3D");
    expect(HOME).not.toContain("CompassFilter");
    const compass = src("components", "home", "CinematicCompass.tsx");
    expect(compass).toContain('r="85"');
    expect(compass).toContain('r="60"');
    expect(compass).toContain('r="35"');
    expect(HERO).not.toContain("{WALK_OBJECT}");
    expect(HERO).not.toContain("WALK_OBJECT");
  });
});

describe("homepage front door — later lines are paper, not a pin", () => {
  it("renders locked later lines as document type, not WalkWords", () => {
    expect(HOME).toContain("type-display");
    expect(HOME).not.toContain("WalkWords");
    expect(HOME).not.toContain("h-[100dvh]");
    expect(HOME).not.toContain("walk-hold");
    expect(WALK_PRIMARY).toContain("when");
    expect(WALK_OBJECT).toContain("when");
  });
});

describe("homepage front door — native scroll only", () => {
  const files = [HERO, HOME].join("\n");

  it("does not hijack scroll or import GSAP / Lenis / SplitType", () => {
    expect(files).not.toMatch(/preventDefault/);
    expect(files).not.toMatch(/scroll-snap|scrollSnap|pin-spacer|pinSpacer/);
    expect(files).not.toMatch(/from\s+["'](?:gsap|lenis|split-type|@studio-freight\/lenis)["']/);
    expect(files).not.toContain('addEventListener("scroll"');
  });
});

describe("homepage front door — parked theater and TeraFab stack stay off", () => {
  it("does not mount killed theater, Packet 2, or /advisor", () => {
    expect(HOME).not.toMatch(/from\s+["']@\/components\/home\/AlignmentScene["']/);
    expect(HOME).not.toMatch(/from\s+["']@\/components\/home\/ThresholdPreview["']/);
    expect(HOME).not.toMatch(/from\s+["']@\/components\/home\/VerdictShift["']/);
    expect(HOME).not.toMatch(/from\s+["']@\/components\/home\/Voices["']/);
    expect(HOME).not.toMatch(/from\s+["']@\/components\/home\/DecisionOrbit["']/);
    expect(HOME).not.toMatch(/from\s+["']@\/components\/home\/Flashlight["']/);
    expect(HOME).not.toMatch(/from\s+["']@\/components\/home\/TimelineShift["']/);
    expect(HOME).not.toMatch(/from\s+["']@\/components\/home\/StatementReveal["']/);
    expect(HOME).not.toMatch(/from\s+["']@\/components\/home\/ObjectReveal["']/);
    expect(HOME).not.toContain("<AlignmentScene");
    expect(HOME).not.toContain("<ThresholdPreview");
    expect(HOME).not.toContain("<Voices");
    expect(HOME).not.toContain("<table");
    expect(HOME).not.toContain("/advisor");
    expect(HOME).not.toContain("Packet 2");
    expect(HOME).not.toContain("HōMI Score");
    expect(HOME).not.toContain("4:3:2");
    expect(HOME).not.toContain("85/60/35");
    expect(HERO).not.toContain("4:3:2");
    expect(HERO).not.toContain("85/60/35");
  });

  it("does not copy the TeraFab stack, chrome, or inventory", () => {
    expect(HOME).not.toContain("tf-page");
    expect(HOME).not.toContain("tf-guides");
    expect(HOME).not.toContain("tf-panel");
    expect(HOME).not.toContain("Watch Now");
    expect(HOME).not.toContain("Kardashev");
    expect(HOME).not.toContain("Inter Tight");
    expect(HOME).not.toContain("object-hero");
    expect(HOME).not.toContain("object-key");
    expect(HERO).not.toContain("tf-kicker");
    expect(HERO).not.toContain("What this is");
    expect(HERO).not.toContain("font-light");
    expect(`${HOME}\n${HERO}`).not.toContain("Trinity");
    expect(`${HOME}\n${HERO}`).not.toContain("70 · told to wait");
    expect(`${HOME}\n${HERO}`).not.toMatch(/Geist|SF Pro|Inter Tight/);
  });
});

describe("homepage front door — cookie copy stays locked", () => {
  it("does not rewrite the consent sentence or button labels", () => {
    const banner = src("components", "consent", "CookieConsent.tsx");
    expect(banner).toContain(
      "HōMI uses essential cookies to keep you signed in. Optional analytics help us improve the",
    );
    expect(banner).toContain("product — your choice, and you can change it anytime. No ad tech.");
    expect(banner).toContain("Reject optional");
    expect(banner).toContain("Accept optional");
    expect(banner).toContain("Cookie policy");
  });

  it("keeps the cookie hairline from #230", () => {
    const banner = src("components", "consent", "CookieConsent.tsx");
    expect(banner).toContain("border-t border-white/[0.06]");
  });

  it("keeps Accept filled and Reject as text — one accent", () => {
    const banner = src("components", "consent", "CookieConsent.tsx");
    expect(banner).toContain("cookie-reject");
    expect(banner).toMatch(
      /Accept optional[\s\S]{0,80}btn-primary|btn-primary[\s\S]{0,120}Accept optional/,
    );
    const rejectBlock = banner.slice(
      banner.indexOf("Reject optional") - 180,
      banner.indexOf("Reject optional"),
    );
    expect(rejectBlock).not.toContain("btn-primary");
    expect(rejectBlock).not.toContain("btn-ghost");
  });
});

describe("homepage front door — desktop hamburger stays hidden", () => {
  it("keeps the lg:hidden wrapper on the marketing hamburger", () => {
    const shell = src("components", "layout", "HeaderShell.tsx");
    expect(shell).toContain('className="ml-auto lg:hidden"');
    expect(shell).not.toContain("chrome-icon-btn ml-auto lg:ml-0 lg:hidden");
  });
});

describe("homepage front door — guest / nav is slim", () => {
  it("keeps five marketing nav items for other routes and gates them off /", () => {
    const header = src("components", "layout", "SiteHeader.tsx");
    const navBlock = header.slice(header.indexOf("const NAV"), header.indexOf("] as const"));
    expect((navBlock.match(/label:/g) ?? []).length).toBe(5);
    expect(header).toContain("How It Works");
    expect(header).toContain("Assessment");
    expect(header).toContain("Guides");
    expect(header).toContain("Pricing");
    expect(header).toContain("For Teams");
    expect(header).toContain('pathname === "/"');
    expect(header).toContain("slimHome");
    expect(header).toContain("Sign in");
    expect(header).toContain("PRIMARY_CLOSE_HREF");
    expect(header).toContain("PRIMARY_CLOSE_LABEL");
  });
});

describe("homepage front door — waitlist Get notified is off /", () => {
  it("keeps Get notified on WaitlistForm and removes the homepage capture", () => {
    const form = src("components", "marketing", "WaitlistForm.tsx");
    expect(form).toContain("Get notified");
    expect(HOME).not.toContain("WaitlistForm");
    expect(HOME).not.toContain('source="landing"');
    expect(HOME).not.toContain('idPrefix="landing-waitlist"');
    expect(HOME).not.toContain('surface="whisper"');
    expect(HOME).not.toContain('id="waitlist"');
    expect(HOME).not.toContain("Get notified");
  });
});

describe("homepage front door — footer educational line stays", () => {
  it("home quiet cut prints only the muted educational line", () => {
    const quiet = src("components", "layout", "QuietHomeFooter.tsx");
    expect(quiet).toContain("bg-navy");
    expect(quiet).toContain("Educational only — not financial advice.");
    expect(quiet).not.toContain("HōMI provides educational guidance only.");
    expect(quiet).not.toContain("LEGAL_DISCLAIMER");
    expect(quiet).not.toContain("Decision Readiness Intelligence");
  });

  it("sitemap footer keeps the long educational paragraph", () => {
    const sitemap = src("components", "layout", "SitemapFooter.tsx");
    expect(sitemap).toContain("Educational only &mdash; not financial advice.");
    expect(sitemap).toContain(
      "HōMI provides educational guidance only. Consider consulting qualified professionals",
    );
    expect(sitemap).toContain(
      "before making legal, tax, mortgage, investment, or real estate decisions.",
    );
  });
});
