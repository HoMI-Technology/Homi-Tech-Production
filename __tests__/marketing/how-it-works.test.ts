import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";

const ROOT = process.cwd();
const PAGE = readFileSync(join(ROOT, "app", "(marketing)", "how-it-works", "page.tsx"), "utf8");

const ASSESS_CARD =
  "Answer honest questions across Financial Reality, Emotional Truth, and Perfect Timing. Sliders, not essays.";
const VERDICT_CARD =
  "Three pillars, not equal. Financial Reality 35. Emotional Truth 35. Perfect Timing 30. How they combine stays ours. Then hard-stops — conditions that override the math because they are not safe to build on top of.";
const PILLAR_INTRO =
  "Three pillars, not equal. Financial Reality 35. Emotional Truth 35. Perfect Timing 30. How they combine stays ours. Here is what each pillar looks at and why it matters.";
const WEIGHTS_LOCK =
  "Three pillars, not equal. Financial Reality 35. Emotional Truth 35. Perfect Timing 30. How they combine stays ours.";
const BUILD_CARD =
  "Not yet is a starting line, not a wall. You get a map: the specific, ordered things to build first.";

const KILLED = [
  "200+ signals",
  "200+ signals. 3 dimensions. 1 score.",
  "equally-weighted",
  "equal weights",
  "weights are a trade secret",
  "HōMI weighs all three pillars equally",
  "We don’t publish exact point values or weights — those are the trade secret.",
  "We don&rsquo;t publish exact point values or weights — those are the trade secret.",
  "shadow version",
  "Get your score — 90 seconds",
  "Every verdict below READY comes with a map",
  "HōMI weighs Financial Reality, Emotional Truth, and Perfect Timing at 35 / 35 / 30, then checks for hard-stops — conditions that override the math entirely because they are not safe to build on top of.",
  "The public weights are 35 / 35 / 30 — Financial Reality, Emotional Truth, Perfect Timing. Here is what each pillar looks at and why it matters.",
] as const;

describe("how-it-works — Brand-authored lock", () => {
  it("pins the Product weights lock character-for-character", () => {
    expect(PAGE).toContain(WEIGHTS_LOCK);
  });

  it("pins the three Brand-authored lines character-for-character", () => {
    expect(PAGE).toContain(ASSESS_CARD);
    expect(PAGE).toContain(VERDICT_CARD);
    expect(PAGE).toContain(PILLAR_INTRO);
    expect(PAGE).toContain(BUILD_CARD);
  });

  it("locks CANON numbers as not-equal / not-secret — never a different 35/35/30 wording", () => {
    expect(PAGE).toContain(WEIGHTS_LOCK);
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

  it("locks the finance-packet credit disclaimer", () => {
    expect(PAGE).toContain("HōMI Score is not a credit score.");
    expect(PAGE).toContain("Lenders will still pull a credit report.");
    expect(PAGE).toContain(
      "Fannie&apos;s manual floor is still 620. That is their gate, not a HōMI verdict.",
    );
    expect(PAGE).not.toContain("replace your credit score");
    expect(PAGE).not.toContain("HōMI-approved");
    expect(PAGE).not.toContain("UltraFICO");
  });

  it("does not add Trinity, Homie, Advisor, Packet 2 theater, or a founder name", () => {
    expect(PAGE).not.toContain("Trinity");
    expect(PAGE).not.toContain("Homie");
    expect(PAGE).not.toContain("Advisor");
    expect(PAGE).not.toContain("Packet 2");
    expect(PAGE).not.toMatch(/Cody Short|founder/i);
  });
});
