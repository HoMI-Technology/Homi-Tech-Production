import { describe, expect, it } from "vitest";
import { buildFallbackReply } from "@/lib/advisor/fallback";

const staleAssessment = {
  score: 69,
  verdict: "ALMOST_THERE" as const,
  pillars: { financial: 73, emotional: 70, timing: 64 },
  hardStops: [],
  ageDays: 120,
  previousScore: 65,
};

describe("Companion fallback honesty", () => {
  it("discloses a stale assessment before answering a readiness question", () => {
    const reply = buildFallbackReply({
      message: "My score said almost there months ago, so I'm ready now, right?",
      assessment: staleAssessment,
    });

    expect(reply).toContain("120 days old");
    expect(reply).toMatch(/refresh|reassess|assessment again/i);
    expect(reply).not.toMatch(/you're ready/i);
  });

  it("does not imply readiness when a fresh verdict is below READY", () => {
    const reply = buildFallbackReply({
      message: "Waiting is for cowards. I'm ready mentally, so let's go.",
      assessment: { ...staleAssessment, ageDays: 2 },
    });

    expect(reply).toContain("ALMOST THERE");
    expect(reply).not.toMatch(/you're ready/i);
    expect(reply).toMatch(/not a green light|not ready/i);
  });
});
