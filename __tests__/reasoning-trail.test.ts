/**
 * ReasoningTrail construction contracts.
 * Fixtures cover confidence bands + pillar blockers; magnitude bands only —
 * never WEIGHTS, never invented money.
 */

import { describe, expect, it } from "vitest";
import type { StoredAssessment } from "@/lib/assessment/storage";
import {
  buildReasoningTrail,
  pillarGapBand,
} from "@/lib/readiness/reasoning-trail";
import type { DataQualityConfidence } from "@/lib/readiness/confidence";

function makeStored(overrides: {
  score?: number;
  verdict?: StoredAssessment["result"]["verdict"];
  pillars?: { financial: number; emotional: number; timing: number };
  previous?: StoredAssessment["previous"];
  completedAt?: string;
  hardStops?: Array<{ code: string; message: string }>;
}): StoredAssessment {
  const pillars = overrides.pillars ?? { financial: 28, emotional: 24, timing: 19 };
  return {
    inputs: {},
    result: {
      score: overrides.score ?? 71,
      verdict: overrides.verdict ?? "ALMOST_THERE",
      financial: { total: pillars.financial },
      emotional: { total: pillars.emotional },
      timing: { total: pillars.timing },
      hardStops: overrides.hardStops ?? [],
      warnings: [],
    },
    completedAt: overrides.completedAt ?? new Date().toISOString(),
    kind: "full",
    previous: overrides.previous,
  } as unknown as StoredAssessment;
}

function confidence(
  band: DataQualityConfidence["band"],
  pathMode: DataQualityConfidence["pathMode"] = "assessment_only",
  isDampened = band !== "high",
): Pick<DataQualityConfidence, "band" | "pathMode" | "reasons" | "isDampened"> {
  return {
    band,
    pathMode,
    reasons: [],
    isDampened,
  };
}

describe("pillarGapBand", () => {
  it("maps deficit from pillar max into magnitude bands only", () => {
    expect(pillarGapBand(95)).toBe("small");
    expect(pillarGapBand(75)).toBe("moderate");
    expect(pillarGapBand(40)).toBe("large");
  });
});

describe("buildReasoningTrail", () => {
  it("always returns a trail for a first assessment — no invented prior story", () => {
    const trail = buildReasoningTrail({
      stored: makeStored({ previous: undefined }),
      confidence: confidence("medium"),
    });
    expect(trail.title).toBe("How we read this");
    expect(trail.items.some((i) => i.kind === "verdict")).toBe(true);
    expect(trail.items.some((i) => i.kind === "movement")).toBe(false);
    expect(trail.items.some((i) => i.kind === "bridge")).toBe(true);
    expect(trail.items.map((i) => i.line).join(" ")).not.toMatch(/weight|formula|0\.\d{2}/i);
  });

  it("names the weakest pillar as a soft blocker with a magnitude gap band", () => {
    const trail = buildReasoningTrail({
      stored: makeStored({
        score: 58,
        verdict: "BUILD_FIRST",
        // timing furthest from ready (19/30 ≈ 63% → moderate gap)
        pillars: { financial: 30, emotional: 28, timing: 12 },
      }),
      confidence: confidence("high", "assessment_plus_finance", false),
    });
    const blocker = trail.items.find((i) => i.kind === "pillar_blocker");
    expect(blocker?.line).toMatch(/Perfect Timing/);
    expect(blocker?.band).toBe("large");
    expect(blocker?.line).toMatch(/large gap/);
    expect(blocker?.line).not.toMatch(/\d/);
  });

  it("surfaces protective hard stops before soft pillar context", () => {
    const trail = buildReasoningTrail({
      stored: makeStored({
        score: 82,
        verdict: "NOT_YET",
        hardStops: [
          {
            code: "RUNWAY_UNDER_1_MONTH",
            message: "You have less than one month of expenses set aside.",
          },
        ],
        pillars: { financial: 20, emotional: 30, timing: 25 },
      }),
      confidence: confidence("low"),
    });
    const kinds = trail.items.map((i) => i.kind);
    expect(kinds.indexOf("hard_stop")).toBeLessThan(kinds.indexOf("pillar_blocker"));
    expect(trail.items.find((i) => i.kind === "hard_stop")?.line).toMatch(/runway/i);
    expect(trail.items.find((i) => i.kind === "verdict")?.line).toMatch(/DO NOT PROCEED/);
  });

  it("folds confidence band honesty — high vs low fixtures", () => {
    const high = buildReasoningTrail({
      stored: makeStored({}),
      confidence: confidence("high", "assessment_plus_finance", false),
    });
    const low = buildReasoningTrail({
      stored: makeStored({}),
      confidence: confidence("low", "assessment_only", true),
    });
    expect(high.items.find((i) => i.kind === "confidence")?.line).toMatch(/high/i);
    expect(high.items.find((i) => i.kind === "confidence")?.line).toMatch(/Assessment \+ finance/);
    expect(low.items.find((i) => i.kind === "confidence")?.line).toMatch(/low/i);
    expect(low.items.find((i) => i.kind === "confidence")?.line).toMatch(/raw stays canonical/i);
  });

  it("includes since-last-time movement in magnitude bands when previous exists", () => {
    const trail = buildReasoningTrail({
      stored: makeStored({
        score: 71,
        pillars: { financial: 28, emotional: 24, timing: 19 },
        previous: {
          score: 63,
          verdict: "BUILD_FIRST",
          completedAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
          pillars: { financial: 21, emotional: 23, timing: 19 },
        },
      }),
      confidence: confidence("medium"),
    });
    const movement = trail.items.find((i) => i.kind === "movement");
    expect(movement?.line).toMatch(/Since last time/);
    expect(movement?.line).toMatch(/Financial Reality/);
    expect(movement?.band).toBe("large");
    // Movement lines stay band-only (no pillar point counts).
    expect(movement?.line).not.toMatch(/\d/);
  });

  it("never includes AI-knows-best or invented money phrasing", () => {
    const trail = buildReasoningTrail({
      stored: makeStored({
        hardStops: [{ code: "DTI_OVER_50", message: "DTI above 50%." }],
        verdict: "NOT_YET",
        score: 40,
      }),
      confidence: confidence("medium"),
    });
    const blob = trail.items.map((i) => i.line).join("\n");
    expect(blob).not.toMatch(/AI knows best/i);
    expect(blob).not.toMatch(/\$\d/);
    expect(blob).not.toMatch(/WEIGHTS|curve/i);
  });
});
