import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

describe("homepage walk — locked first viewport", () => {
  const hero = src("components", "home", "InterviewHero.tsx");

  it("pins the three locked first-viewport lines and Assess → First Moment", () => {
    expect(hero).toContain("Will you be okay?");
    expect(hero).toContain("A Decision Companion.");
    expect(hero).toContain("Everyone else tells you how. HōMI tells you if.");
    expect(hero).toContain("PRIMARY_CLOSE_HREF");
    expect(hero).toContain("PRIMARY_CLOSE_LABEL");
    expect(hero).toContain("?src=hero");
    expect(hero).toContain('track("hero_cta_click", { src: "hero" })');
  });

  it("does not contain Trinity, wait-rate 70, or a two-column instrument split", () => {
    expect(hero).not.toContain("Trinity");
    expect(hero).not.toContain("70 · told to wait");
    expect(hero).not.toMatch(/lg:grid-cols/);
  });
});

describe("homepage walk — continuation uses existing lines only", () => {
  const home = src("app", "(marketing)", "page.tsx");

  it("keeps the inversion, wrong-question, before-commitment, and not-yet beats", () => {
    expect(home).toContain("A credit score tells institutions if they may trust your history.");
    expect(home).toContain("HōMI helps you know if you can trust the decision.");
    expect(home).toContain("Everyone asks the wrong question.");
    expect(home).toContain("Most systems arrive after you decide.");
    expect(home).toContain("HōMI enters before the commitment.");
    expect(home).toContain("Not yet is not");
    expect(home).toContain("Most people don&rsquo;t regret what they bought");
  });

  it("closes on Assess, with waitlist secondary — no competing primary", () => {
    expect(home).toContain("PRIMARY_CLOSE_HREF");
    expect(home).toContain("PRIMARY_CLOSE_LABEL");
    expect(home).toContain("WaitlistForm");
    expect(home).toContain('source="landing"');
    expect(home).toContain('idPrefix="landing-waitlist"');
    expect(home).toContain('id="waitlist"');
    expect(home).not.toContain("Or start a free assessment");
    expect(home).not.toContain("Explore the Compass");
  });

  it("reuses IdeaBeat / WalkChapter — does not invent a new marketing section type", () => {
    expect(home).toContain("IdeaBeat");
    expect(home).toContain("WalkChapter");
    expect(home).toContain("InterviewHero");
  });
});

describe("homepage walk — 2024 SaaS landing is unmounted", () => {
  const home = src("app", "(marketing)", "page.tsx");

  it("does not mount killed theater, tables, or comparison grids", () => {
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/ThresholdPreview["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/VerdictShift["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/Voices["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/DecisionOrbit["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/Flashlight["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/AlignmentScene["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/TimelineShift["']/);
    expect(home).not.toMatch(/from\s+["']@\/components\/home\/StatementReveal["']/);
    expect(home).not.toContain("<ThresholdPreview");
    expect(home).not.toContain("<Voices");
    expect(home).not.toContain("<table");
    expect(home).not.toMatch(/lg:grid-cols/);
    expect(home).not.toMatch(/md:grid-cols-2/);
    expect(home).not.toContain("HōMI Score");
    expect(home).not.toContain("Permissioned Readiness Summary");
    expect(home).not.toContain("One companion. Three ways to hear it.");
    expect(home).not.toContain("28 / 33 / 36");
    expect(home).not.toContain("Trinity");
    expect(home).not.toContain("70 · told to wait");
  });
});
