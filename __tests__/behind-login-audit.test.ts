import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { verdictEmail } from "@/lib/email/templates";

/**
 * Regression locks for the 2026-08 behind-login audit round:
 * verdict-email subject privacy, honest retake destinations, and the
 * anonymous-readable /demo pillar cards.
 */
const read = (...segs: string[]) => fs.readFileSync(path.join(process.cwd(), ...segs), "utf8");

describe("verdict email privacy", () => {
  it("keeps the score and verdict out of the subject line", () => {
    const { subject, html } = verdictEmail("Cody", 72, "ALMOST_THERE");
    // Subjects surface in lock-screen notifications and inbox previews.
    expect(subject).not.toContain("72");
    expect(subject).not.toContain("ALMOST");
    expect(subject).toBe("Your Decision Readiness Score is in");
    // The full read stays in the body the user deliberately opened.
    expect(html).toContain("72");
    expect(html).toContain("ALMOST THERE");
  });

  it("points the post-verdict CTA at Home Build, not checklist /plan", () => {
    const { html } = verdictEmail("Cody", 72, "ALMOST_THERE");
    expect(html).toContain("/dashboard");
    expect(html).toContain("Continue on Home");
    expect(html).not.toContain("/plan");
    expect(html).not.toContain("See your full plan");
  });
});

describe("retake CTAs land on the flow that can re-score", () => {
  it("report retake goes to /assessment, never the score-less shadow read", () => {
    const report = read("app", "(product)", "report", "[id]", "page.tsx");
    expect(report).toContain("Retake the assessment");
    expect(report).toContain('href="/assessment"');
    expect(report).not.toContain('"/shadow-score"');
  });

  it("report primary CTA is Home Build, with Path alongside", () => {
    const report = read("app", "(product)", "report", "[id]", "page.tsx");
    expect(report).toContain('href="/dashboard"');
    expect(report).toContain("Continue on Home");
    expect(report).toContain('href="/path"');
    expect(report).not.toContain("Build your plan");
    expect(report).not.toMatch(/href="\/plan"/);
    expect(report).not.toContain("PathToReadyCard");
    expect(report).not.toContain("#path-to-ready");
    expect(report).not.toContain("Your next steps");
    expect(report).not.toContain("Your activation path");
  });

  it("middleware retires /results — signed-in → Home, guest → First Moment", () => {
    const mw = read("middleware.ts");
    expect(mw).toContain('path === "/results"');
    expect(mw).toContain('user ? "/dashboard" : "/first-moment"');
    expect(mw).not.toContain("ResultsVerdictView");
  });

  it("plan retake goes to /assessment and Build owns the primary close", () => {
    const plan = read("app", "(product)", "plan", "page.tsx");
    expect(plan).toContain("Re-take the assessment");
    expect(plan).toContain("Continue on Home");
    expect(plan).toContain('href="/path"');
    expect(plan).not.toContain('"/shadow-score"');
    expect(plan).not.toContain("Take the full assessment");
    expect(plan).not.toContain("Your transformation path");
    // Read-only checklist — no local progress store competing with Path.
    expect(plan).not.toContain("homi:plan-progress");
    expect(plan).not.toContain("toggleStep");
    expect(plan).toContain("read-only checklist");
  });
});

describe("sign-up default lands on Assess", () => {
  it("bare sign-up uses POST_LOGIN_ASSESS, not /onboarding", () => {
    const page = read("app", "auth", "sign-up", "page.tsx");
    expect(page).toContain("POST_LOGIN_ASSESS");
    expect(page).toContain("safeNext(searchParams.get(\"next\"), POST_LOGIN_ASSESS)");
    expect(page).not.toContain('safeNext(searchParams.get("next"), "/onboarding")');
  });

  it("completeProfileEmail points at Assess, not /onboarding", () => {
    const templates = read("lib", "email", "templates.ts");
    const start = templates.indexOf("export function completeProfileEmail");
    const end = templates.indexOf("export function startAssessmentEmail");
    const fn = templates.slice(start, end);
    expect(fn).toContain("/assessment");
    expect(fn).not.toContain("/onboarding");
    expect(fn).toContain("about five minutes");
    expect(fn).not.toMatch(/ninety seconds/i);
  });

  it("welcome and start-assessment emails match Assess duration, not Shadow Score", () => {
    const templates = read("lib", "email", "templates.ts");
    expect(templates).toContain("About five minutes tells you the truth");
    expect(templates).toContain("About five minutes of honesty across all three pillars");
    expect(templates).not.toMatch(/Ninety seconds/i);
    expect(templates).not.toMatch(/ninety seconds/i);
  });
});

describe("Companion hand-offs stay on the signed-in measurement path", () => {
  it("advisor tool hand-off allowlist excludes /shadow-score", () => {
    const aliases = read("lib", "architecture", "tool-aliases.ts");
    expect(aliases).toContain('"/assessment"');
    expect(aliases).toContain('"/path"');
    expect(aliases).toContain('"/dashboard"');
    expect(aliases).not.toMatch(/ADVISOR_TOOL_HANDOFF_PATHS[\s\S]*?"\/shadow-score"/);
    expect(aliases).toContain("Do not send signed-in users to /shadow-score");
  });

  it("Companion empty state offers Assess when unscored", () => {
    const chat = read("components", "advisor", "Chat.tsx");
    expect(chat).toContain("SIGNED_IN_ASSESS_HREF");
    expect(chat).toMatch(/>\s*Assess\s*</);
    expect(chat).not.toContain("Take the full assessment first");
  });
});

describe("public demo page secrecy", () => {
  it("renders pillar strength as percentages, never raw n/max pairs", () => {
    const demo = read("app", "(product)", "demo", "page.tsx");
    expect(demo).not.toMatch(/\{value\}\/\{max\}/);
    expect(demo).toMatch(/Math\.round\(pct\)/);
  });
});
