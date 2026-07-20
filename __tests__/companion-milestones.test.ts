/**
 * Milestone contracts. What matters: exactly one milestone per move (the one
 * describing where you are now), both directions marked honestly, no
 * crossing → null, and canon voice (no emoji, no exclamation points).
 */

import { describe, expect, it } from "vitest";
import { findCrossedMilestone } from "@/lib/advisor/milestones";
import { buildScoreExplanation } from "@/lib/advisor/explain";
import type { StoredAssessment } from "@/lib/assessment/storage";

describe("findCrossedMilestone", () => {
  it("reports the HIGHEST threshold on the way up", () => {
    const milestone = findCrossedMilestone(58, 82); // crosses 60, 70, 80
    expect(milestone?.threshold).toBe(80);
    expect(milestone?.direction).toBe("up");
  });

  it("reports the LOWEST threshold on the way down — where you are now", () => {
    const milestone = findCrossedMilestone(82, 58); // crosses 80, 70, 60
    expect(milestone?.threshold).toBe(60);
    expect(milestone?.direction).toBe("down");
  });

  it("returns null when no threshold was crossed, including flat", () => {
    expect(findCrossedMilestone(71, 78)).toBeNull();
    expect(findCrossedMilestone(71, 71)).toBeNull();
    expect(findCrossedMilestone(41, 49)).toBeNull();
  });

  it("landing exactly on a threshold counts as crossing it", () => {
    expect(findCrossedMilestone(69, 70)?.threshold).toBe(70);
    // Falling FROM the threshold crosses below it (70 is no longer held).
    expect(findCrossedMilestone(70, 69)?.threshold).toBe(70);
  });

  it("speaks in canon voice: no emoji, no exclamation points", () => {
    for (const [prev, curr] of [
      [39, 40], [49, 50], [59, 60], [69, 70], [79, 80], [89, 90],
      [40, 39], [50, 49], [60, 59], [70, 69], [80, 79], [90, 89],
    ]) {
      const line = findCrossedMilestone(prev, curr)?.line ?? "";
      expect(line.length).toBeGreaterThan(0);
      expect(line).not.toMatch(/!/);
      expect(line).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });
});

describe("milestones in the explanation", () => {
  function stored(currentScore: number, previousScore: number): StoredAssessment {
    return {
      inputs: {},
      result: {
        score: currentScore,
        verdict: "ALMOST_THERE",
        financial: { total: 28 },
        emotional: { total: 24 },
        timing: { total: 19 },
        hardStops: [],
      },
      completedAt: new Date().toISOString(),
      kind: "full",
      previous: {
        score: previousScore,
        verdict: "BUILD_FIRST",
        completedAt: new Date().toISOString(),
        pillars: { financial: 21, emotional: 23, timing: 19 },
      },
    } as unknown as StoredAssessment;
  }

  it("folds the crossing into the card and the companion line — one story", () => {
    const explanation = buildScoreExplanation(stored(71, 63));
    expect(explanation?.milestone?.threshold).toBe(70);
    expect(explanation?.companionLine).toContain("Milestone:");
    expect(explanation?.companionLine).toContain("crossed 70");
  });

  it("stays null when the move crossed nothing", () => {
    const explanation = buildScoreExplanation(stored(68, 63));
    expect(explanation?.milestone).toBeNull();
    expect(explanation?.companionLine).not.toContain("Milestone:");
  });
});
