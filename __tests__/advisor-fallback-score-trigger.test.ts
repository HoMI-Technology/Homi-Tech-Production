/**
 * Proactive re-check suggestion in the deterministic Companion fallback.
 *
 * When checkLiveScoreTriggers (lib/finance/live-update) detects a scoring-band
 * crossing since the last assessment, the client sends hasScoreTrigger and the
 * fallback opens its greeting with a re-check nudge. The AI model path is
 * untouched — this covers the rule-based fallback only, and the suggestion is
 * a UI signal, never a recomputed score.
 */

import { describe, expect, it } from "vitest";
import {
  buildFallbackReply,
  buildPersonaFallbackReply,
  type AdvisorAssessmentContext,
} from "@/lib/advisor/fallback";

const ASSESSMENT: AdvisorAssessmentContext = {
  score: 58,
  verdict: "BUILD_FIRST",
  pillars: { financial: 55, emotional: 70, timing: 50 },
  hardStops: [],
};

const SUGGESTION = "Your numbers moved";

describe("fallback score-trigger suggestion", () => {
  it("opens the greeting with a re-check suggestion when hasScoreTrigger is true", () => {
    const reply = buildFallbackReply({ message: "", hasScoreTrigger: true });
    expect(reply).toContain(SUGGESTION);
    expect(reply).toContain("want to update your score?");
  });

  it("includes the suggestion on a short greeting message too", () => {
    const reply = buildFallbackReply({ message: "hey", hasScoreTrigger: true });
    expect(reply).toContain(SUGGESTION);
  });

  it("leaves the greeting untouched when hasScoreTrigger is false or absent", () => {
    for (const hasScoreTrigger of [false, null, undefined] as const) {
      const reply = buildFallbackReply({ message: "", hasScoreTrigger });
      expect(reply).not.toContain(SUGGESTION);
      expect(reply).toContain("I'm HōMI");
    }
  });

  it("does not inject the suggestion into non-greeting intents", () => {
    const reply = buildFallbackReply({
      message: "am i ready to buy?",
      assessment: ASSESSMENT,
      hasScoreTrigger: true,
    });
    expect(reply).not.toContain(SUGGESTION);
  });

  it("flows through the persona wrapper unchanged", () => {
    const reply = buildPersonaFallbackReply({
      message: "",
      hasScoreTrigger: true,
      persona: "reality",
    });
    expect(reply).toContain(SUGGESTION);
  });
});
