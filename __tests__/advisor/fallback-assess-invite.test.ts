import { describe, expect, it } from "vitest";
import { buildFallbackReply } from "@/lib/advisor/fallback";

describe("fallback invite — signed-in Assess, not Shadow Score", () => {
  it("no-assessment replies invite /assessment", () => {
    const reply = buildFallbackReply({
      message: "Am I ready to buy?",
      assessment: null,
    });
    expect(reply).toMatch(/\/assessment/);
    expect(reply).not.toMatch(/Shadow Score/i);
  });

  it("empty-thread reflective invite skips Shadow Score", () => {
    const reply = buildFallbackReply({
      message: "hmm not sure",
      assessment: null,
    });
    expect(reply).toMatch(/\/assessment|assessment when you're ready/i);
    expect(reply).not.toMatch(/Shadow Score/i);
  });
});
