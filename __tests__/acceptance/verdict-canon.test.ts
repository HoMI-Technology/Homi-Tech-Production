import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { scoreToVerdict } from "@/lib/scoring/engine";

/**
 * ACCEPTANCE — Verdict canon (BUILD-BRIEF §1.1, §9)
 *
 * Thresholds are boundary-INCLUSIVE: READY>=80, ALMOST_THERE 65-79,
 * BUILD_FIRST 50-64, NOT_YET 0-49. Any UI that maps a number to a verdict
 * must agree with scoreToVerdict(). This suite fails on the current landing
 * page (which shows 82 = "ALMOST THERE"); it passes once that reads READY
 * or the number is corrected to <80.
 */

describe("scoreToVerdict — canonical boundaries", () => {
  const cases: Array<[number, string]> = [
    [100, "READY"],
    [80, "READY"],
    [79, "ALMOST_THERE"],
    [65, "ALMOST_THERE"],
    [64, "BUILD_FIRST"],
    [50, "BUILD_FIRST"],
    [49, "NOT_YET"],
    [0, "NOT_YET"],
  ];
  it.each(cases)("score %i => %s", (score, verdict) => {
    expect(scoreToVerdict(score)).toBe(verdict);
  });
});

const LABEL_TO_VERDICT: Record<string, string> = {
  READY: "READY",
  "ALMOST THERE": "ALMOST_THERE",
  "BUILD FIRST": "BUILD_FIRST",
  "NOT YET": "NOT_YET",
};

/** Reads the landing page source and pairs each standalone displayed score
 *  numeral with the next verdict label within 300 chars. */
function landingScoreVerdictPairs(): Array<{ score: number; label: string; verdict: string }> {
  const path = fileURLToPath(new URL("../../app/(marketing)/page.tsx", import.meta.url));
  const src = readFileSync(path, "utf8");
  const pairs: Array<{ score: number; label: string; verdict: string }> = [];
  const numRe = /score-numeral[^>]*>\s*(\d{1,3})\s*</g;
  let m: RegExpExecArray | null;
  while ((m = numRe.exec(src))) {
    const score = Number(m[1]);
    if (score < 0 || score > 100) continue;
    const after = src.slice(m.index, m.index + 300);
    const label = Object.keys(LABEL_TO_VERDICT).find((l) => after.includes(l));
    if (label) pairs.push({ score, label, verdict: scoreToVerdict(score) });
  }
  return pairs;
}

describe("landing page — hardcoded score/verdict pairs obey canon", () => {
  it("homepage walk has no hardcoded score/verdict pairs", () => {
    expect(landingScoreVerdictPairs()).toEqual([]);
  });
  it("every displayed score matches its verdict label", () => {
    for (const p of landingScoreVerdictPairs()) {
      expect(
        LABEL_TO_VERDICT[p.label],
        `Landing shows score ${p.score} labelled "${p.label}" but canon says ${p.verdict}`,
      ).toBe(p.verdict);
    }
  });
});
