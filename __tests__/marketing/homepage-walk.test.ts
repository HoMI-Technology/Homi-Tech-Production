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
const PERSIST = src("components", "home", "walk-persist.tsx");
const BEAT = src("components", "home", "WalkBeat.tsx");
const HOLD = src("components", "home", "walk-hold.tsx");
const CSS = src("app", "globals.css");

describe("homepage walk — locked copy is character-exact", () => {
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
    expect(WALK_INVERSION).toBe("Everyone else tells you how. HōMI tells you if.");
    expect(WALK_CLARITY).toBe("Clarity, not commission.");
    expect(WALK_NOT_YET).toBe("Not yet is not no.");
    expect(WALK_OBJECT).toBe(
      "The compass that becomes a key when you're finally ready to turn it.",
    );
  });

  it("mounts every locked line on the walk and does not paste First Moment beats", () => {
    expect(HERO).toContain("WALK_QUESTION");
    expect(HOME).toContain("WALK_COMPANION");
    expect(HOME).toContain("WALK_INVERSION");
    expect(HOME).toContain("WALK_PRIMARY");
    expect(HOME).toContain("WALK_CLARITY");
    expect(HOME).toContain("WALK_OBJECT");
    expect(HOME).toContain("Not yet is not");
    expect(HOME).toContain('className="text-emerald"');
    for (const beat of FIRST_MOMENT_BEATS) {
      expect(HOME).not.toContain(beat.line);
      expect(HERO).not.toContain(beat.line);
    }
  });
});

describe("homepage walk — first viewport is the painted question", () => {
  it("renders the H1 as solid type-giant with no opacity or typewriter", () => {
    expect(HERO).toContain("type-giant");
    expect(HERO).toContain("{WALK_QUESTION}");
    expect(HERO).not.toContain("opacity-0");
    expect(HERO).not.toContain("opacity: 0");
    expect(HERO).not.toMatch(/typewriter|split-type|SplitType/i);
    expect(HERO).not.toContain("WalkWords");
    expect(HERO).not.toMatch(/<(p|a|button|svg)[\s>]/);
    expect((HERO.match(/<h1[\s>]/g) ?? []).length).toBe(1);
  });

  it("holds the question as a sticky 100vh scene, cinema=hero", () => {
    expect(HERO).toContain("HoldStage");
    expect(HERO).toContain('cinema="hero"');
    expect(HERO).toContain("hero-story");
    expect(CSS).toContain('[data-cinema="hero"] .walk-word');
    expect(CSS).toContain("color: var(--color-light)");
  });

  it("does not put Assess, a pill, or a compass on the question", () => {
    expect(HERO).not.toContain("PRIMARY_CLOSE");
    expect(HERO).not.toContain("btn-primary");
    expect(HERO).not.toContain("CinematicCompass");
    expect(HERO).not.toContain("walk-travel-assess");
    expect(HERO).not.toContain("object-hero");
    expect(HERO).not.toMatch(/lg:grid-cols/);
  });
});

describe("homepage walk — one traveling Assess", () => {
  it("keeps a single walk pill on PRIMARY_CLOSE → First Moment", () => {
    expect(PERSIST).toContain("PRIMARY_CLOSE_HREF");
    expect(PERSIST).toContain("PRIMARY_CLOSE_LABEL");
    expect(PERSIST).toContain("?src=hero");
    expect(PERSIST).toContain('track("hero_cta_click", { src: "hero" })');
    expect((PERSIST.match(/btn-primary/g) ?? []).length).toBe(1);
    expect((PERSIST.match(/data-walk-assess=""/g) ?? []).length).toBe(1);
    expect(HOME).not.toContain("btn-primary");
    expect(HOME).not.toContain("PRIMARY_CLOSE");
    expect(BEAT).not.toContain("btn-primary");
    expect(BEAT).not.toContain("PRIMARY_CLOSE");
  });

  it("sits the pill below the line band, then parks before waitlist, footer, and cookie", () => {
    expect(PERSIST).toContain("walk-travel-assess-stack");
    expect(PERSIST).toContain("walk-line");
    expect(PERSIST).toContain('minHeight: "14rem"');
    expect(BEAT).toContain("max-w-5xl");
    expect(PERSIST).toContain('querySelector("#waitlist")');
    expect(PERSIST).toContain('querySelector("footer")');
    expect(PERSIST).toContain('querySelector("#cookie-consent")');
    expect(PERSIST).toContain("inert={assessAway");
    expect(PERSIST).toContain("aria-hidden={assessAway");
    expect(PERSIST).toContain("data-cookie");
    expect(HOME).toContain('id="waitlist"');
    expect(HOME).toContain("WaitlistForm");
    expect(HOME).toContain('source="landing"');
    expect(HOME).toContain('idPrefix="landing-waitlist"');
    expect(HOME).toContain('surface="whisper"');
  });

  it("travels the Brand compass in the lower-right field, off the type", () => {
    expect(PERSIST).toContain("CinematicCompass");
    expect(PERSIST).toContain("walk-travel-compass");
    expect(PERSIST).toContain("COMPASS_FIELD");
    expect(PERSIST).toContain('right: "max(1.25rem, 5vw)"');
    expect(PERSIST).toContain('bottom: "max(6.75rem, 12vh)"');
    expect(PERSIST).toContain('width: "min(26vmin, 9.25rem)"');
    expect(PERSIST).not.toContain("hero-instrument-field");
    expect(PERSIST).not.toContain("lg:left-[38%]");
    expect(PERSIST).not.toContain("is-object");
    expect(PERSIST).not.toContain("walk-compass-halo");
    expect(PERSIST).not.toContain('verdict="READY"');
    expect(HOME).not.toContain("CinematicCompass");
    expect(HOME).not.toContain("CompassFilter");
    const compass = src("components", "home", "CinematicCompass.tsx");
    expect(compass).toContain('r="85"');
    expect(compass).toContain('r="60"');
    expect(compass).toContain('r="35"');
  });
});

describe("homepage walk — later lines are scroll-lit, not typed", () => {
  it("lights later words with color fill from a readable dim, reversible with scroll", () => {
    expect(BEAT).toContain("WalkWords");
    expect(BEAT).not.toContain('paint="full"');
    expect(HOLD).toContain("requestAnimationFrame");
    expect(HOLD).toContain("setProgress");
    expect(HOLD).toContain("smoothstep");
    expect(CSS).toContain("--walk-alpha-dim: 0.4");
    expect(CSS).toContain(".walk-word[data-on]");
    expect(HOLD).not.toContain("opacity-0");
    expect(BEAT).not.toContain("opacity-0");
    expect(`${HOLD}\n${BEAT}`).not.toMatch(/split-type|SplitType|letter-spacing:\s*0\s+\w/i);
  });

  it("paints every word immediately under prefers-reduced-motion", () => {
    expect(HOLD).toContain("prefers-reduced-motion");
    expect(HOLD).toContain("setProgress(1)");
    expect(CSS).toContain("@media (prefers-reduced-motion: reduce)");
    expect(CSS).toContain(".walk-word {\n      color: var(--color-light)");
  });

  it("holds one idea per 1.0–1.3 viewports with no dead navy fade", () => {
    expect(HOLD).toContain("walk-hold");
    expect(CSS).toContain("height: 122dvh");
    expect(CSS).toContain("margin-bottom: -22vh");
    expect(CSS).toContain("Do not fade the stage");
    expect(BEAT).toContain("h-[100dvh]");
    expect(HERO).toContain("h-[100dvh]");
  });
});

describe("homepage walk — native scroll only", () => {
  const files = [HERO, BEAT, PERSIST, HOLD, HOME].join("\n");

  it("does not hijack scroll or import GSAP / Lenis / SplitType / Three", () => {
    expect(files).not.toMatch(/preventDefault/);
    expect(files).not.toMatch(/scroll-snap|scrollSnap|pin-spacer|pinSpacer/);
    expect(files).not.toMatch(
      /from\s+["'](?:gsap|lenis|split-type|@studio-freight\/lenis|three)["']/,
    );
  });

  it("reads progress on rAF from native scroll — no Lenis", () => {
    expect(HOLD).toContain('addEventListener("scroll"');
    expect(HOLD).toContain("{ passive: true }");
    expect(HOLD).toContain("requestAnimationFrame");
  });
});

describe("homepage walk — parked theater and TeraFab stack stay off", () => {
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
    expect(PERSIST).not.toContain("4:3:2");
    expect(PERSIST).not.toContain("85/60/35");
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
    expect(`${HOME}\n${HERO}\n${BEAT}`).not.toContain("Trinity");
    expect(`${HOME}\n${HERO}`).not.toContain("70 · told to wait");
  });
});

describe("homepage walk — cookie copy stays locked", () => {
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

describe("homepage walk — desktop hamburger stays hidden", () => {
  it("keeps the lg:hidden wrapper on the marketing hamburger", () => {
    const shell = src("components", "layout", "HeaderShell.tsx");
    expect(shell).toContain('className="ml-auto lg:hidden"');
    expect(shell).not.toContain("chrome-icon-btn ml-auto lg:ml-0 lg:hidden");
  });
});

describe("homepage walk — five nav items stay", () => {
  it("keeps five marketing nav items", () => {
    const header = src("components", "layout", "SiteHeader.tsx");
    const navBlock = header.slice(header.indexOf("const NAV"), header.indexOf("] as const"));
    expect((navBlock.match(/label:/g) ?? []).length).toBe(5);
    expect(header).toContain("How It Works");
    expect(header).toContain("Assessment");
    expect(header).toContain("Guides");
    expect(header).toContain("Pricing");
    expect(header).toContain("For Teams");
  });
});

describe("homepage walk — waitlist Get notified stays", () => {
  it("keeps the whisper waitlist submit label", () => {
    const form = src("components", "marketing", "WaitlistForm.tsx");
    expect(form).toContain("Get notified");
    expect(HOME).toContain("WaitlistForm");
    expect(HOME).not.toContain("Get notified");
  });
});

describe("homepage walk — footer educational line stays", () => {
  it("keeps the educational line in the footer, character-matched", () => {
    const footer = src("components", "layout", "SiteFooter.tsx");
    expect(footer).toContain("bg-navy");
    expect(footer).toContain("Educational only &mdash; not financial advice.");
    expect(footer).toContain(
      "HōMI provides educational guidance only. Consider consulting qualified professionals",
    );
    expect(footer).toContain(
      "before making legal, tax, mortgage, investment, or real estate decisions.",
    );
  });
});
