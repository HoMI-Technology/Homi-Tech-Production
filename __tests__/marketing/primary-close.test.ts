import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

const BANNED_LABEL_SNIPPETS = [
  "Get your score",
  "Check My Readiness",
  "Check my readiness",
  "See my verdict",
];

describe("SiteHeader primary close", () => {
  const header = src("components", "layout", "SiteHeader.tsx");

  it("uses the Assess close, not /shadow-score", () => {
    expect(header).toContain("PRIMARY_CLOSE_HREF");
    expect(header).toContain("PRIMARY_CLOSE_LABEL");
    expect(header).not.toContain('href="/shadow-score"');
    expect(header).not.toContain("Get your score");
  });
});

describe("InterviewHero primary close", () => {
  const hero = src("components", "home", "InterviewHero.tsx");

  it("uses the Assess close, not /shadow-score", () => {
    expect(hero).toContain("PRIMARY_CLOSE_HREF");
    expect(hero).toContain("PRIMARY_CLOSE_LABEL");
    expect(hero).not.toContain("/shadow-score");
    expect(hero).not.toContain("Check My Readiness");
  });

  it("does not claim answers are unstored or unsent", () => {
    expect(hero).not.toMatch(/aren.?t stored or sent/i);
    expect(hero).not.toContain("aren't stored");
    expect(hero).not.toContain("aren&rsquo;t stored");
  });
});

describe("homepage primary labels", () => {
  it.each([
    ["components/layout/SiteHeader.tsx"],
    ["components/home/InterviewHero.tsx"],
    ["components/home/ThresholdPreview.tsx"],
  ])("%s does not use banned primary-close labels", (rel) => {
    const text = src(...rel.split("/"));
    for (const banned of BANNED_LABEL_SNIPPETS) {
      expect(text).not.toContain(banned);
    }
  });
});

describe("onboarding Shadow Score fork", () => {
  it("offers Assess only — no /shadow-score fork", () => {
    const page = src("app", "(product)", "onboarding", "page.tsx");
    expect(page).toContain('href="/assessment"');
    expect(page).not.toContain('href="/shadow-score"');
    expect(page).not.toContain("Shadow Score");
  });
});

describe("First Moment page handoff", () => {
  it("redirects signed-in users to the 45-q and renders First Moment for everyone else", () => {
    const page = src("app", "(marketing)", "first-moment", "page.tsx");
    expect(page).toContain("SIGNED_IN_ASSESS_HREF");
    expect(page).toContain("FirstMoment");
    expect(page).not.toContain("/shadow-score");
    expect(page).not.toContain("/results");
  });
});
