/**
 * Explainability contracts. What matters: no previous result → no invented
 * story (null); movement is expressed only in magnitude bands (never raw
 * weights); pillar-less legacy snapshots degrade honestly; staleness and
 * hard stops surface as caveats; the Companion one-liner exists whenever the
 * card renders, so chat and view tell one story.
 */

import { describe, expect, it } from "vitest";
import { buildScoreExplanation } from "@/lib/advisor/explain";
import type { StoredAssessment } from "@/lib/assessment/storage";

function makeStored(overrides: {
  score?: number;
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
      verdict: "ALMOST_THERE",
      financial: { total: pillars.financial },
      emotional: { total: pillars.emotional },
      timing: { total: pillars.timing },
      hardStops: overrides.hardStops ?? [],
    },
    completedAt: overrides.completedAt ?? new Date().toISOString(),
    kind: "full",
    previous: overrides.previous,
  } as unknown as StoredAssessment;
}

describe("buildScoreExplanation", () => {
  it("returns null for a first assessment — no invented story", () => {
    expect(buildScoreExplanation(makeStored({ previous: undefined }))).toBeNull();
  });

  it("explains movement in magnitude bands, biggest mover first", () => {
    const explanation = buildScoreExplanation(
      makeStored({
        score: 71,
        pillars: { financial: 28, emotional: 24, timing: 19 },
        previous: {
          score: 63,
          verdict: "BUILD_FIRST",
          completedAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
          // financial +7 of 35 (20% -> large), emotional +1 of 35 (~3% -> small), timing flat
          pillars: { financial: 21, emotional: 23, timing: 19 },
        },
      }),
    );
    expect(explanation?.headline).toBe("Your score moved from 63 to 71.");
    expect(explanation?.movements[0].name).toBe("Financial Reality");
    expect(explanation?.movements[0].band).toBe("large");
    expect(explanation?.movements[0].line).not.toMatch(/\d/); // bands, never numbers
    const timing = explanation?.movements.find((m) => m.key === "timing");
    expect(timing?.direction).toBe("flat");
    expect(timing?.line).toBe("Perfect Timing held steady.");
    expect(explanation?.companionLine).toContain("up 8");
    expect(explanation?.companionLine).toContain("financial reality improved");
  });

  it("degrades honestly when the previous snapshot lacks pillar detail", () => {
    const explanation = buildScoreExplanation(
      makeStored({
        score: 71,
        previous: { score: 63, verdict: "BUILD_FIRST", completedAt: new Date().toISOString() },
      }),
    );
    expect(explanation?.movements).toHaveLength(0);
    expect(explanation?.caveats[0]).toContain("Only your previous total");
  });

  it("flags staleness and hard stops as caveats", () => {
    const explanation = buildScoreExplanation(
      makeStored({
        completedAt: new Date(Date.now() - 100 * 86_400_000).toISOString(),
        hardStops: [{ code: "dti", message: "DTI above 50%" }],
        previous: {
          score: 63,
          verdict: "BUILD_FIRST",
          completedAt: new Date(Date.now() - 130 * 86_400_000).toISOString(),
          pillars: { financial: 21, emotional: 23, timing: 19 },
        },
      }),
    );
    expect(explanation?.caveats.some((c) => c.includes("days old"))).toBe(true);
    expect(explanation?.caveats.some((c) => c.includes("hard stop"))).toBe(true);
  });

  it("says 'held' plainly when nothing moved", () => {
    const explanation = buildScoreExplanation(
      makeStored({
        score: 71,
        pillars: { financial: 28, emotional: 24, timing: 19 },
        previous: {
          score: 71,
          verdict: "ALMOST_THERE",
          completedAt: new Date().toISOString(),
          pillars: { financial: 28, emotional: 24, timing: 19 },
        },
      }),
    );
    expect(explanation?.headline).toBe("Your score held at 71.");
    expect(explanation?.companionLine).toContain("unchanged");
  });
});
