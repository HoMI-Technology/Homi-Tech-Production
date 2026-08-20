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
    expect(subject).toBe("Your HōMI-Score is in");
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
  it("results retake goes to /assessment, never the score-less shadow read", () => {
    const view = read("components", "results", "ResultsVerdictView.tsx");
    expect(view).toContain("Retake the assessment");
    expect(view).not.toContain('"/shadow-score"');
  });

  it("results primary CTA is auth-aware: Home for signed-in, save for guests", () => {
    const view = read("components", "results", "ResultsVerdictView.tsx");
    expect(view).toContain('href="/dashboard"');
    expect(view).toContain("Continue on Home");
    expect(view).toContain('href="/auth/sign-up"');
    expect(view).toContain("Save your progress");
    expect(view).toContain('href="/path"');
    expect(view).not.toContain("Build your plan");
    expect(view).not.toMatch(/href="\/plan"/);
    // Reveal only — Path operate lives on Home / /path, not inlined on /results.
    expect(view).not.toContain("PathToReadyCard");
    expect(view).not.toContain("#path-to-ready");
    expect(view).not.toContain("Your next steps");
    expect(view).not.toContain("Your activation path");
  });

  it("plan retake goes to /assessment and Build owns the primary close", () => {
    const plan = read("app", "(product)", "plan", "page.tsx");
    expect(plan).toContain("Re-take the assessment");
    expect(plan).toContain("Continue on Home");
    expect(plan).toContain('href="/path"');
    expect(plan).not.toContain('"/shadow-score"');
    expect(plan).not.toContain("Your transformation path");
  });
});

describe("public demo page secrecy", () => {
  it("renders pillar strength as percentages, never raw n/max pairs", () => {
    const demo = read("app", "(product)", "demo", "page.tsx");
    expect(demo).not.toMatch(/\{value\}\/\{max\}/);
    expect(demo).toMatch(/Math\.round\(pct\)/);
  });
});
