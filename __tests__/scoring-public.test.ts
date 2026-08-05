import { describe, it, expect } from "vitest";
import { PILLAR_MAX_POINTS, scoreToVerdict } from "@/lib/scoring/public";
import { PILLAR_MAX_POINTS as WEIGHTS_PILLAR_MAX } from "@/lib/scoring/weights";
import { scoreToVerdict as engineScoreToVerdict } from "@/lib/scoring/engine";

/**
 * Public scoring seam (Plans.md 6.1). lib/scoring/public.ts is the ONLY
 * scoring module client code may value-import once 6.5 poisons the rest with
 * server-only. It carries exactly the values already shown to users (pillar
 * display maxima, verdict thresholds) — never engine internals.
 *
 * These tests run server-side and may import the engine; they pin the public
 * module to the engine so the two can never drift.
 */

describe("lib/scoring/public seam", () => {
  it("pillar max points are the single source weights.ts re-exports", () => {
    expect(WEIGHTS_PILLAR_MAX).toBe(PILLAR_MAX_POINTS); // same frozen object, not a copy
    expect(PILLAR_MAX_POINTS).toEqual({ financial: 35, emotional: 35, timing: 30 });
    expect(Object.isFrozen(PILLAR_MAX_POINTS)).toBe(true);
  });

  it("scoreToVerdict matches the engine across the full range", () => {
    for (let score = 0; score <= 100; score += 0.5) {
      expect(scoreToVerdict(score)).toBe(engineScoreToVerdict(score));
    }
  });

  it("verdict thresholds are boundary-inclusive per canon", () => {
    expect(scoreToVerdict(80)).toBe("READY");
    expect(scoreToVerdict(79)).toBe("ALMOST_THERE");
    expect(scoreToVerdict(65)).toBe("ALMOST_THERE");
    expect(scoreToVerdict(64)).toBe("BUILD_FIRST");
    expect(scoreToVerdict(50)).toBe("BUILD_FIRST");
    expect(scoreToVerdict(49)).toBe("NOT_YET");
    expect(scoreToVerdict(0)).toBe("NOT_YET");
  });
});
