import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";

const ROOT = process.cwd();
const PAGE = readFileSync(join(ROOT, "app", "(marketing)", "how-it-works", "page.tsx"), "utf8");

const ASSESS_CARD =
  "Answer honest questions across Financial Reality, Emotional Truth, and Perfect Timing. Sliders, not essays.";
const VERDICT_CARD =
  "HōMI weighs Financial Reality, Emotional Truth, and Perfect Timing at 35 / 35 / 30, then checks for hard-stops — conditions that override the math entirely because they are not safe to build on top of.";
const PILLAR_INTRO =
  "The public weights are 35 / 35 / 30 — Financial Reality, Emotional Truth, Perfect Timing. Here is what each pillar looks at and why it matters.";

const KILLED = [
  "200+ signals",
  "200+ signals. 3 dimensions. 1 score.",
  "HōMI weighs all three pillars equally",
  "We don’t publish exact point values or weights — those are the trade secret.",
  "We don&rsquo;t publish exact point values or weights — those are the trade secret.",
  "shadow version",
  "Get your score — 90 seconds",
] as const;

describe("how-it-works — Brand-authored lock", () => {
  it("pins the three Brand-authored lines character-for-character", () => {
    expect(PAGE).toContain(ASSESS_CARD);
    expect(PAGE).toContain(VERDICT_CARD);
    expect(PAGE).toContain(PILLAR_INTRO);
  });

  it("publishes CANON weights 35 / 35 / 30 — never equal weights or a hidden-weight claim", () => {
    expect(PAGE).toContain("35 / 35 / 30");
    expect(PAGE).not.toMatch(/weighs all three pillars equally/i);
    expect(PAGE).not.toContain("those are the trade secret");
    expect(PAGE).not.toContain("We don’t publish exact point values or weights");
    expect(PAGE).not.toContain("We don&rsquo;t publish exact point values or weights");
  });

  it("kills the live FAIL strings", () => {
    for (const killed of KILLED) {
      expect(PAGE, `must not contain: ${killed}`).not.toContain(killed);
    }
  });

  it("closes on Assess → First Moment, not /shadow-score or /assessment", () => {
    expect(PAGE).toContain("PRIMARY_CLOSE_HREF");
    expect(PAGE).toContain("PRIMARY_CLOSE_LABEL");
    expect(PRIMARY_CLOSE_HREF).toBe("/first-moment");
    expect(PRIMARY_CLOSE_LABEL).toBe("Assess");
    expect(PAGE).not.toContain('href="/shadow-score"');
    expect(PAGE).not.toContain('href="/assessment"');
    expect(PAGE).not.toContain("Get your score");
  });

  it("does not add Trinity, Homie, Advisor, Packet 2 theater, or a founder name", () => {
    expect(PAGE).not.toContain("Trinity");
    expect(PAGE).not.toContain("Homie");
    expect(PAGE).not.toContain("Advisor");
    expect(PAGE).not.toContain("Packet 2");
    expect(PAGE).not.toMatch(/Cody Short|founder/i);
  });
});
