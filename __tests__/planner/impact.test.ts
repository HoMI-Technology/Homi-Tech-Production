import { describe, it, expect } from "vitest";
import { buildScoreImpact, impactToSnapshot } from "@/lib/planner/impact";
import type { ScoreResult } from "@/lib/planner/score-result";

function result(
  score: number,
  verdict: ScoreResult["verdict"],
  hardStops: ScoreResult["hardStops"] = [],
): ScoreResult {
  return {
    score,
    verdict,
    hardStops,
    warnings: [],
    pillars: {
      financial: {
        key: "financial",
        total: 25,
        max: 35,
        factors: [],
      },
      emotional: {
        key: "emotional",
        total: 23,
        max: 35,
        factors: [],
      },
      timing: {
        key: "timing",
        total: 22,
        max: 30,
        factors: [],
      },
    },
  };
}

describe("buildScoreImpact", () => {
  it("describes flat path completion without shaming", () => {
    const before = result(73, "ALMOST_THERE");
    const after = result(73, "ALMOST_THERE");
    const impact = buildScoreImpact(before, after, "Path step completed");
    expect(impact.delta).toBe(0);
    expect(impact.actionKind).toBe("path_done");
    expect(impact.headline.toLowerCase()).not.toContain("failure");
  });

  it("counts hard-stop clear", () => {
    const before = result(50, "NOT_YET", [
      {
        code: "CREDIT_UNDER_620",
        message: "Credit below 620.",
      },
    ]);
    const after = result(68, "ALMOST_THERE");
    const impact = buildScoreImpact(before, after, "Bill paid");
    expect(impact.hardStopsCleared).toBe(1);
    expect(impact.delta).toBeGreaterThan(0);
  });

  it("impactToSnapshot round-trips core fields", () => {
    const impact = buildScoreImpact(
      result(60, "BUILD_FIRST"),
      result(70, "ALMOST_THERE"),
      "Bill paid",
    );
    const snap = impactToSnapshot(impact);
    expect(snap.fromScore).toBe(60);
    expect(snap.toScore).toBe(70);
    expect(snap.actionKind).toBe("bill_paid");
  });
});
