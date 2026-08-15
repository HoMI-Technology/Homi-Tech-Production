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

  it("holds one idea and resolves walk words grey→white; PRM is static", () => {
    expect(hero).toContain("HoldStage");
    expect(hero).toContain("WalkWords");
    expect(hero).toContain("tokenizeWalkLine");
    const hold = src("components", "home", "walk-hold.tsx");
    expect(hold).toContain("walk-hold");
    expect(hold).toContain("walk-word");
    expect(hold).toContain("prefers-reduced-motion: reduce");
    const css = src("app", "globals.css");
    expect(css).toContain(".walk-hold");
    expect(css).toContain(".walk-word");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).not.toMatch(/\.walk-hold[^{]*\{[^}]*pin-scene/);
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
    expect(persist).toContain("<CinematicCompass");
    expect(persist).not.toContain("Compass3D");
    expect(hero).not.toContain("Compass3D");
    expect(hero).not.toContain("<CinematicCompass");
    expect(home).not.toContain("<CinematicCompass");
    expect((persist.match(/<CinematicCompass/g) ?? []).length).toBe(1);
    expect(persist).toContain("btn btn-primary btn-sm");
    expect(persist).not.toContain("btn-glow");
    expect(hero).not.toContain("btn-glow");
    expect(hero).not.toContain("btn-primary");
    expect(home).not.toContain("btn-primary");
    expect(compass).toContain('r="85"');
    expect(compass).toContain('r="60"');
    expect(compass).toContain('r="35"');
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
