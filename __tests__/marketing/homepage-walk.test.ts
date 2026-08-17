import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TAGLINES } from "@/lib/brand";
import { FIRST_MOMENT_BEATS } from "@/components/marketing/first-moment-copy";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

describe("homepage hybrid — locked first viewport", () => {
  const hero = src("components", "home", "InterviewHero.tsx");

  it("sizes the question as the largest display", () => {
    expect(hero).toContain("type-giant");
    expect(hero).not.toContain("type-statement");
  });

  it("pins the three locked first-viewport lines and Assess → First Moment", () => {
    expect(hero).toContain("Will you be okay?");
    expect(hero).toContain("A Decision Companion.");
    expect(hero).toContain("Everyone else tells you how. HōMI tells you if.");
    expect(hero).toContain("PRIMARY_CLOSE_HREF");
    expect(hero).toContain("PRIMARY_CLOSE_LABEL");
    expect(hero).toContain("?src=hero");
    expect(hero).toContain('track("hero_cta_click", { src: "hero" })');
    expect(hero).toContain('href="#statement"');
    expect(hero).toContain("What this is");
  });

  it("does not contain Trinity, wait-rate 70, or a two-column instrument split", () => {
    expect(hero).not.toContain("Trinity");
    expect(hero).not.toContain("70 · told to wait");
    expect(hero).not.toMatch(/lg:grid-cols/);
  });

  it("keeps the object panel inside the raster it actually has", () => {
    // The stills are 1280×720 and cannot be re-rendered here. A full-bleed
    // `fill` + sizes="100vw" asked the optimizer for 3840px of them on every
    // retina viewport; the optimizer does not upscale, so the brass came back
    // soft. Intrinsic width/height plus a panel capped at 6 of 12 columns
    // keeps the object oversampled even at 2×. Re-adding `fill` undoes it.
    expect(hero).toContain("width={1280}");
    expect(hero).toContain("height={720}");
    expect(hero).not.toMatch(/^\s*fill$/m);
    expect(hero).not.toContain('sizes="100vw"');
    expect(src("app", "globals.css")).toContain("max-width: 566px");
  });

  it("grounds the page on flat canon navy — no gradient, no off-token slab", () => {
    // The reference's ground is flat. So is this one; the previous build's
    // radial+linear ramp was neither the reference nor canon.
    const css = src("app", "globals.css");
    const page = css.slice(css.indexOf(".tf-page {"), css.indexOf(".tf-shell {"));
    expect(page).toContain("background: var(--color-navy)");
    expect(page).not.toMatch(/background:\s*#040b16;/);
    expect(page).not.toContain("radial-gradient");
  });

  it("drops the invalid overflow-wrap value from the giant display", () => {
    // `balance` is not a legal overflow-wrap value; the parser dropped it and
    // `text-wrap: balance` was doing the work all along.
    expect(src("app", "globals.css")).not.toContain("overflow-wrap: balance");
  });

  it("is a still first screen — photo object, no pin-scroll, no traveling Assess", () => {
    expect(hero).not.toContain("HoldStage");
    expect(hero).not.toContain("WalkPersist");
    expect(hero).not.toContain("walk-travel-assess");
    expect(hero).not.toContain("CinematicCompass");
    expect(hero).toContain("/marketing/home/object-hero.jpg");
    expect(hero).not.toContain("4:3:2");
    expect(hero).not.toContain("85/60/35");
  });

  it("keeps hero padding and stack inside the first viewport", () => {
    expect(hero).toContain("pt-24");
    expect(hero).not.toContain("pt-28");
    expect(hero).not.toContain("pt-32");
    expect((hero.match(/<p[\s>]/g) ?? []).length).toBe(1);
    expect(src("app", "globals.css")).toContain("min-height: calc(100dvh - var(--nav-offset))");
  });

  it("keeps What this is as a text kicker, not a pill", () => {
    // `walk-kicker` is walk-era CSS: absolutely positioned, uppercase, wide
    // tracked, underlined. It escaped its column on mobile and is the opposite
    // of the reference's plain 13px sans line. `tf-kicker` replaces it.
    expect(hero).toContain("tf-kicker");
    expect(hero).not.toContain("walk-kicker");
    expect(hero).toContain("What this is");
    expect(hero).not.toMatch(/What this is[\s\S]{0,80}btn/);
  });
});

describe("homepage hybrid — readable front door", () => {
  const home = src("app", "(marketing)", "page.tsx");

  it("keeps the keep-list lines after the hero", () => {
    expect(home).toContain("TAGLINES.primary");
    expect(TAGLINES.primary).toBe("Know when you're ready. Move when it matters.");
    expect(home).toContain("Not yet is not");
    expect(home).toContain(
      "The compass that becomes a key when you&rsquo;re finally ready to turn it.",
    );
    expect(home).toContain("Clarity, not commission.");
    expect(home).toContain('id="statement"');
  });

  it("explains the product in three steps without scoring internals", () => {
    expect(home).toContain("Assess");
    expect(home).toContain("Verdict");
    expect(home).toContain("Build");
    expect(home).toContain("/how-it-works");
    expect(home).not.toContain("35/35/30");
    expect(home).not.toContain("4:3:2");
    expect(home).not.toContain("85/60/35");
  });

  it("carries the reference's grammar — guides, tier rows, flush panels", () => {
    // Measured off terafab.ai's own stylesheet, not recalled: a 12-column
    // structural guide overlay, hairline tier rows, and flush hard-edged
    // object panels. Roman-numeral scene marks were a misread of that site's
    // Kardashev *content* as a structural device — do not bring them back.
    expect(home).toContain("tf-guides-grid");
    expect(home).toContain("tf-rows");
    expect(home).toContain("tf-panel");
    expect(home).not.toMatch(/numeral: "I+"/);
    expect(home).not.toContain("I — Thesis");
    expect(home).not.toContain("V — Close");
  });

  it("keeps display type restrained and light, per the reference", () => {
    // The reference's hero title caps at 4.4rem at weight 300 — it is not
    // cinema-scale, and it is never bold. A 7.5rem semibold headline was the
    // single biggest reason the last pass did not read as that site.
    const css = src("app", "globals.css");
    const giant = css.slice(
      css.indexOf(".tf-page .type-giant {"),
      css.indexOf(".tf-page .type-display {"),
    );
    expect(giant).toContain("clamp(2.4rem, 5.2vw, 4.4rem)");
    expect(giant).toContain("font-weight: 300");
    expect(giant).toContain("letter-spacing: -0.035em");
    const heroSrc = src("components", "home", "InterviewHero.tsx");
    expect(heroSrc).toContain("font-light");
    expect(heroSrc).not.toContain("font-semibold");
    expect(home).not.toContain("font-semibold");
  });

  it("keeps the kicker a plain 13px sans line, not a wide-tracked overline", () => {
    const css = src("app", "globals.css");
    const kicker = css.slice(css.indexOf(".tf-kicker {"), css.indexOf(".tf-code {"));
    expect(kicker).toContain("font-size: 13px");
    expect(kicker).toContain("font-weight: 400");
    expect(kicker).not.toContain("text-transform: uppercase");
  });

  it("spends the accent budget once each — cyan on the close, emerald on no", () => {
    expect((home.match(/text-emerald/g) ?? []).length).toBe(1);
    expect(home).not.toContain("text-cyan");
    expect(home).not.toContain("text-yellow");
    expect((home.match(/btn-primary/g) ?? []).length).toBe(1);
  });

  it("stays type and air — no glass card wall, no 01/02/03", () => {
    expect(home).not.toMatch(/\bclassName="[^"]*glass/);
    expect(home).not.toContain("glass-hover");
    expect(home).not.toContain("md:grid-cols-3");
    expect(home).not.toContain("md:grid-cols");
    expect(home).not.toContain('"01"');
    expect(home).not.toContain('"02"');
    expect(home).not.toContain('"03"');
    expect(home).not.toContain("score-numeral");
    expect(home).not.toContain("CinematicCompass");
    expect(home).not.toContain("CinemaFX");
    expect(home).toContain("/marketing/home/object-key.jpg");
    expect(home).toContain("ObjectReveal");
  });

  it("says what HōMI is not, without a brochure table", () => {
    expect(home).toContain("What HōMI is not");
    expect(home).toContain("Not a lender or broker");
    expect(home).toContain("Not a credit bureau");
    expect(home).toContain("Not financial advice");
    expect(home).not.toContain("<table");
  });

  it("does not restate the hero inversion or paste First Moment beats", () => {
    expect(home).not.toContain("Everyone else tells you how");
    expect(home).not.toContain("Will you be okay?");
    expect(home).not.toContain("A Decision Companion.");
    for (const beat of FIRST_MOMENT_BEATS) {
      expect(home).not.toContain(beat.line);
    }
  });

  it("closes with Assess plus a whisper waitlist — no remounted theater", () => {
    expect(home).toContain("PRIMARY_CLOSE_HREF");
    expect(home).toContain("PRIMARY_CLOSE_LABEL");
    expect(home).toContain("WaitlistForm");
    expect(home).toContain('source="landing"');
    expect(home).toContain('idPrefix="landing-waitlist"');
    expect(home).toContain('id="waitlist"');
    expect(home).toContain('surface="whisper"');
    expect(home).not.toContain("WalkPersist");
    expect(home).not.toContain("IdeaBeat");
    expect(home).not.toContain("WalkChapter");
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

  it("does not remount StatementReveal or AlignmentScene", () => {
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/StatementReveal["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/AlignmentScene["']/);
    expect(home).not.toContain("<StatementReveal");
    expect(home).not.toContain('className="pin-scene');
    expect(home).not.toContain('data-testid="alignment-pin-stage"');
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

describe("homepage hybrid — brochure inventory is unmounted", () => {
  const home = src("app", "(marketing)", "page.tsx");

  it("does not mount killed theater or fake-score surfaces", () => {
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
    expect(home).not.toContain("HōMI Score");
    expect(home).not.toContain("Permissioned Readiness Summary");
    expect(home).not.toContain("One companion. Three ways to hear it.");
    expect(home).not.toContain("28 / 33 / 36");
    expect(home).not.toContain("35/35/30");
    expect(home).not.toContain("No commissions");
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

describe("homepage hybrid — no scroll jack", () => {
  const files = [
    src("components", "home", "InterviewHero.tsx"),
    src("components", "home", "ObjectReveal.tsx"),
    src("app", "(marketing)", "page.tsx"),
  ].join("\n");

  it("does not jack scroll or import GSAP / Lenis / SplitType / Three", () => {
    expect(files).not.toMatch(/preventDefault/);
    expect(files).not.toMatch(/scroll-snap|scrollSnap|pin-spacer|pinSpacer/);
    expect(files).not.toMatch(
      /from\s+["'](?:gsap|lenis|split-type|@studio-freight\/lenis|three)["']/,
    );
    expect(files).not.toContain('addEventListener("scroll"');
    expect(files).not.toContain("window.scrollY");
  });

  it("lifts the object scrim with a view timeline, not a scroll listener", () => {
    const css = src("app", "globals.css");
    expect(css).toContain("animation-timeline: view()");
    expect(css).toContain("@property --p");
    expect(src("components", "home", "ObjectReveal.tsx")).not.toContain("useEffect");
  });

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
