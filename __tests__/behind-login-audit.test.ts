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
});

describe("retake CTAs land on the flow that can re-score", () => {
  it("results retake goes to /assessment, never the score-less shadow read", () => {
    const view = read("components", "results", "ResultsVerdictView.tsx");
    expect(view).toContain("Retake the assessment");
    expect(view).not.toContain('"/shadow-score"');
  });

  it("plan retake goes to /assessment", () => {
    const plan = read("app", "(product)", "plan", "page.tsx");
    expect(plan).toContain("Re-take the assessment");
    expect(plan).not.toContain('"/shadow-score"');
  });
});

describe("public demo page secrecy", () => {
  it("renders pillar strength as percentages, never raw n/max pairs", () => {
    const demo = read("app", "(product)", "demo", "page.tsx");
    expect(demo).not.toMatch(/\{value\}\/\{max\}/);
    expect(demo).toMatch(/Math\.round\(pct\)/);
  });
});
