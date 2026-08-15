import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TAGLINES } from "@/lib/brand";
import { FIRST_MOMENT_BEATS } from "@/components/marketing/first-moment-copy";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

describe("homepage walk — locked first viewport", () => {
  const hero = src("components", "home", "InterviewHero.tsx");
  const persist = src("components", "home", "walk-persist.tsx");

  it("sizes the question as the largest display, not a two-column split", () => {
    expect(hero).toContain("type-giant");
    expect(persist).toContain("lg:left-[38%]");
    expect(hero).not.toContain("type-statement");
  });

  it("pins the three locked first-viewport lines and Assess → First Moment", () => {
    expect(hero).toContain("Will you be okay?");
    expect(hero).toContain("A Decision Companion.");
    expect(hero).toContain("Everyone else tells you how. HōMI tells you if.");
    expect(persist).toContain("PRIMARY_CLOSE_HREF");
    expect(persist).toContain("PRIMARY_CLOSE_LABEL");
    expect(persist).toContain("?src=hero");
    expect(persist).toContain('track("hero_cta_click", { src: "hero" })');
    expect(hero).toContain('href="#statement"');
    expect(hero).toContain("What this is");
  });

  it("does not contain Trinity, wait-rate 70, or a two-column instrument split", () => {
    expect(hero).not.toContain("Trinity");
    expect(hero).not.toContain("70 · told to wait");
    expect(hero).not.toMatch(/lg:grid-cols/);
  });

  it("holds one idea and scroll-lits later words; PRM is static", () => {
    expect(hero).toContain("HoldStage");
    expect(hero).toContain("WalkWords");
    expect(hero).toContain("tokenizeWalkLine");
    const hold = src("components", "home", "walk-hold.tsx");
    expect(hold).toContain("walk-hold");
    expect(hold).toContain("walk-word");
    expect(hold).toContain("--walk-progress");
    expect(hold).toContain("prefers-reduced-motion: reduce");
    expect(hold).toContain("{token.text}");
    const css = src("app", "globals.css");
    expect(css).toContain(".walk-hold");
    expect(css).toContain(".walk-word");
    expect(css).toContain("--walk-alpha-dim: 0.4");
    expect(css).toContain("var(--color-light)");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).not.toMatch(/\.walk-hold[^{]*\{[^}]*pin-scene/);
    const wordBlock = css.slice(css.indexOf("  .walk-word {"), css.indexOf("  .walk-word[data-on]"));
    expect(wordBlock).not.toContain("opacity: 0");
    expect(wordBlock).toContain("--walk-alpha-dim");
  });

  it("paints the locked hero question fully on first paint", () => {
    const opening = hero.slice(hero.indexOf("function OpeningBeat"), hero.indexOf("function useHeroField"));
    expect(opening).toContain("Will you be okay?");
    expect(opening).toContain('paint="full"');
    expect(opening).toContain("<WalkWords paint=\"full\">Will you be okay?</WalkWords>");
    const hold = src("components", "home", "walk-hold.tsx");
    expect(hold).toContain('paint === "full"');
    const css = src("app", "globals.css");
    expect(css).toMatch(/\[data-cinema="hero"\]\s*\.walk-word\s*\{[^}]*color:\s*var\(--color-light\)/);
    expect(css).not.toMatch(/\[data-cinema="hero"\]\s*\.walk-word\s*\{[^}]*opacity:\s*0/);
    expect(css).toMatch(/\[data-cinema="hero"\]\s*\.walk-word\s*\{[^}]*transition:\s*none/);
  });

  it("keeps What this is as a text kicker, not a pill, and Assess under the line band", () => {
    expect(hero).toContain("walk-kicker");
    expect(hero).toContain("What this is");
    expect(hero).not.toMatch(/What this is[\s\S]{0,80}btn/);
    expect(persist).toContain("walk-travel-assess");
    expect(persist).toContain("walk-line");
    expect(persist).not.toContain("bottom-[max(6.5rem");
    expect(persist).toContain("is-parked");
    expect(persist).toContain('"parked"');
  });
});

describe("homepage walk — Knowledge keep-list only", () => {
  const home = src("app", "(marketing)", "page.tsx");

  it("continues with keep-list jobs: if/when, permission to wait, the object", () => {
    expect(home).toContain("TAGLINES.primary");
    expect(TAGLINES.primary).toBe("Know when you're ready. Move when it matters.");
    expect(home).toContain("Not yet is not");
    expect(home).toContain("The compass that becomes a key when you&rsquo;re finally ready to turn it.");
    expect(home).toContain("Clarity, not commission.");
    expect(home).toContain("WalkPersist");
    expect(home).toContain('id="statement"');
  });

  it("does not restate the hero inversion or paste First Moment beats", () => {
    expect(home).not.toContain("Everyone else tells you how");
    expect(home).not.toContain("Will you be okay?");
    expect(home).not.toContain("A Decision Companion.");
    for (const beat of FIRST_MOMENT_BEATS) {
      expect(home).not.toContain(beat.line);
    }
  });

  it("closes on a traveling Assess; waitlist is a whisper — no remounted primary", () => {
    expect(home).toContain("WalkPersist");
    expect(home).toContain("WaitlistForm");
    expect(home).toContain('source="landing"');
    expect(home).toContain('idPrefix="landing-waitlist"');
    expect(home).toContain('id="waitlist"');
    expect(home).toContain('surface="whisper"');
    expect(home).toContain("walk-waitlist-form");
    expect(home).not.toContain("opacity-50");
    const waitlist = src("components", "marketing", "WaitlistForm.tsx");
    expect(waitlist).toContain('type="submit"');
    expect(waitlist).toContain("Get notified");
    expect(waitlist).toContain("walk-waitlist-submit");
    expect(home).not.toContain("PRIMARY_CLOSE_HREF");
    expect(home).not.toContain("PRIMARY_CLOSE_LABEL");
    expect(home).not.toContain("Or start a free assessment");
    expect(home).not.toContain("Explore the Compass");
    expect(home).not.toContain("Get notified");
  });

  it("does not insert a disclaimer chapter between hero and #statement", () => {
    const start = home.indexOf("<InterviewHero");
    const end = home.indexOf('id="statement"');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(home.slice(start, end)).not.toContain("Educational only");
  });

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

  it("reuses IdeaBeat / WalkChapter — does not invent a new marketing section type", () => {
    expect(home).toContain("IdeaBeat");
    expect(home).toContain("WalkChapter");
    expect(home).toContain("InterviewHero");
    expect(home).toContain("WalkPersist");
  });

  it("travels one CinematicCompass and one small Assess — no remount, no large hero CTA", () => {
    const persist = src("components", "home", "walk-persist.tsx");
    const hero = src("components", "home", "InterviewHero.tsx");
    const compass = src("components", "home", "CinematicCompass.tsx");
    expect(persist).toContain("<CinematicCompass responsive keyholePulse={false} />");
    expect(persist).not.toMatch(/<CinematicCompass[^>]*\bsize=/);
    expect(persist).not.toContain("Compass3D");
    expect(hero).not.toContain("Compass3D");
    expect(hero).not.toContain("<CinematicCompass");
    expect(home).not.toContain("<CinematicCompass");
    expect((persist.match(/<CinematicCompass/g) ?? []).length).toBe(1);
    expect(persist).toContain("btn btn-primary btn-sm");
    expect(persist).toContain("walk-compass-halo");
    expect(persist).not.toContain("btn-glow");
    expect(hero).not.toContain("btn-glow");
    expect(hero).toContain("data-walk-hero-assess");
    expect(hero).toContain("btn btn-primary btn-sm");
    expect(home).not.toContain("btn-primary");
    expect(compass).toContain('r="85"');
    expect(compass).toContain('r="60"');
    expect(compass).toContain('r="35"');
    expect(home).not.toContain("4:3:2");
    expect(home).not.toContain("85/60/35");
    expect(persist).not.toContain("4:3:2");
    expect(persist).not.toContain("85/60/35");
    expect(hero).not.toContain("4:3:2");
    expect(hero).not.toContain("85/60/35");
  });

  it("does not remount StatementReveal or AlignmentScene for the word hold", () => {
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/StatementReveal["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/AlignmentScene["']/);
    expect(home).not.toContain("<StatementReveal");
    expect(home).not.toContain('className="pin-scene');
    expect(home).not.toContain("data-testid=\"alignment-pin-stage\"");
  });
});

describe("homepage walk — cookie copy stays locked", () => {
  it("does not rewrite the consent sentence or button labels", () => {
    const banner = src("components", "consent", "CookieConsent.tsx");
    expect(banner).toContain("HōMI uses essential cookies to keep you signed in. Optional analytics help us improve the");
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
    expect(banner).toMatch(/Accept optional[\s\S]{0,80}btn-primary|btn-primary[\s\S]{0,120}Accept optional/);
    const rejectBlock = banner.slice(banner.indexOf("Reject optional") - 180, banner.indexOf("Reject optional"));
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

describe("homepage walk — brochure inventory is unmounted", () => {
  const home = src("app", "(marketing)", "page.tsx");

  it("does not mount killed theater, tables, grids, or AlignmentScene", () => {
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/AlignmentScene["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/ThresholdPreview["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/VerdictShift["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/Voices["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/DecisionOrbit["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/Flashlight["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/TimelineShift["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/StatementReveal["']/);
    expect(home).not.toContain("<AlignmentScene");
    expect(home).not.toContain("<ThresholdPreview");
    expect(home).not.toContain("<Voices");
    expect(home).not.toContain("<table");
    expect(home).not.toMatch(/lg:grid-cols/);
    expect(home).not.toMatch(/md:grid-cols-2/);
    expect(home).not.toContain("HōMI Score");
    expect(home).not.toContain("Permissioned Readiness Summary");
    expect(home).not.toContain("One companion. Three ways to hear it.");
    expect(home).not.toContain("28 / 33 / 36");
    expect(home).not.toContain("35/35/30");
    expect(home).not.toContain("No commissions");
    expect(home).not.toContain("What HōMI is not");
    expect(home).not.toContain("Your Decision Companion");
    expect(home).not.toContain("Everyone asks the wrong question.");
    expect(home).not.toContain("Home is the first threshold.");
    expect(home).not.toContain("A credit score tells institutions");
    expect(home).not.toContain("Trinity");
    expect(home).not.toContain("70 · told to wait");
    expect(home).not.toContain("Homie");
    expect(home).not.toContain("ALMOST THERE");
    expect(home).not.toContain("DO NOT PROCEED");
    expect(home).not.toContain("BUILD FIRST");
  });
});

describe("homepage walk — craft failure modes", () => {
  const walkFiles = [
    src("components", "home", "walk-hold.tsx"),
    src("components", "home", "walk-persist.tsx"),
    src("components", "home", "InterviewHero.tsx"),
    src("app", "(marketing)", "page.tsx"),
  ].join("\n");
  const css = src("app", "globals.css");
  const persist = src("components", "home", "walk-persist.tsx");
  const hold = src("components", "home", "walk-hold.tsx");
  const compass = src("components", "home", "CinematicCompass.tsx");
  const waitlist = src("components", "marketing", "WaitlistForm.tsx");

  it("does not jack scroll or import GSAP / Lenis / SplitType / Three", () => {
    expect(walkFiles).not.toMatch(/preventDefault/);
    expect(walkFiles).not.toMatch(/scroll-snap|scrollSnap|pin-spacer|pinSpacer/);
    expect(css).not.toMatch(/\.walk-hold[^{]*\{[^}]*scroll-snap/);
    expect(hold).toContain("passive: true");
    expect(hold).toContain("requestAnimationFrame");
    expect(hold).not.toMatch(/addEventListener\(\s*["']wheel["']/);
    expect(walkFiles).not.toMatch(
      /from\s+["'](?:gsap|lenis|split-type|@studio-freight\/lenis|three)["']/,
    );
  });

  it("keeps the scene contract at 1.0–1.3 viewports with no empty-navy fade", () => {
    expect(css).toContain("height: 122dvh");
    expect(css).toContain("margin-bottom: -22vh");
    expect(css).not.toContain("(var(--walk-words, 4) + 0.2) * 15vh");
    const stage = css.slice(css.indexOf(".walk-hold-stage {"), css.indexOf(".walk-cluster {"));
    expect(stage).not.toContain("--walk-progress");
    expect(stage).not.toContain("opacity:");
  });

  it("keeps later hold words readable at low alpha — not opacity 0", () => {
    const wordBlock = css.slice(css.indexOf("  .walk-word {"), css.indexOf("  .walk-word[data-on]"));
    expect(wordBlock).toContain("--walk-alpha-dim");
    expect(wordBlock).not.toContain("opacity: 0");
    expect(hold).toContain("{token.text}");
    expect(hold).toContain("smoothstep");
    expect(unlitWhiteOnNavyContrast(0.4)).toBeGreaterThanOrEqual(3);
    expect(unlitWhiteOnNavyContrast(0.38)).toBeGreaterThanOrEqual(3);
  });

  it("locks waitlist / Get notified / Assess href and parks the follower over them", () => {
    expect(waitlist).toContain("Get notified");
    expect(persist).toContain("PRIMARY_CLOSE_HREF");
    expect(persist).toContain("PRIMARY_CLOSE_LABEL");
    expect(persist).toContain("?src=hero");
    expect(persist).toContain("#waitlist");
    expect(persist).toContain("#cookie-consent");
    expect(persist).toContain("data-walk-hero-assess");
    expect(persist).toContain("heroAssessGone");
    expect(persist).toContain("docked || footerIn");
    expect(css).toContain(".walk-travel-assess[data-fade]");
    expect(css).toContain("scroll-padding-bottom");
    expect(src("components", "consent", "CookieConsent.tsx")).toContain("z-[60]");
    expect(persist).toContain("z-[5]");
  });

  it("jumps PRM to final states — no pin, no shortened jack", () => {
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*\.walk-hold\s*\{[\s\S]*height:\s*auto/);
    expect(hold).toContain('setProgress(1)');
    expect(hold).toContain("prefers-reduced-motion: reduce");
    expect(css).not.toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*\.walk-hold\s*\{[\s\S]*15vh/);
  });

  it("keeps the walk compass SVG, pauses parked rings, and caps mobile DPR", () => {
    expect(compass).toContain("<svg");
    expect(compass).not.toMatch(/getContext\s*\(/);
    expect(compass).toContain("COMPASS_MAX_DEVICE_PIXEL_RATIO = 1.5");
    expect(css).toContain("animation-play-state: paused");
    expect(persist).toContain("<CinematicCompass responsive keyholePulse={false} />");
  });

  it("keeps waitlist field borders at 3:1 non-text contrast", () => {
    expect(css).toContain("border-color: rgb(148 163 184 / 0.64)");
    expect(css).toContain("color: rgb(148 163 184 / 0.82)");
    expect(css).not.toContain("border-color: rgb(148 163 184 / 0.48)");
  });

  it("uses one walk ease, docks the compass, and keeps five nav items", () => {
    expect(css).toContain("--walk-ease: cubic-bezier(0.4, 0, 0.2, 1)");
    expect(persist).toContain('"docked"');
    expect(css).toContain("[data-at=\"docked\"]");
    const header = src("components", "layout", "SiteHeader.tsx");
    const navBlock = header.slice(header.indexOf("const NAV"), header.indexOf("] as const"));
    expect((navBlock.match(/label:/g) ?? []).length).toBe(5);
    expect(header).toContain("How It Works");
    expect(header).toContain("Assessment");
    expect(header).toContain("Guides");
    expect(header).toContain("Pricing");
    expect(header).toContain("For Teams");
    expect(css).toContain("letter-spacing: 0.01em");
    expect(src("app", "(marketing)", "page.tsx")).not.toContain("type-h1");
  });
});

function unlitWhiteOnNavyContrast(alpha: number): number {
  const navy: [number, number, number] = [10, 22, 40];
  const white: [number, number, number] = [255, 255, 255];
  const blended = white.map((channel, i) => channel * alpha + navy[i] * (1 - alpha)) as [
    number,
    number,
    number,
  ];
  return contrastRatio(blended, navy);
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
