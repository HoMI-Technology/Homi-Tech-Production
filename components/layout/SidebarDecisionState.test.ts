import { describe, expect, it } from "vitest";
import { parseLatestVerdict } from "@/components/layout/SidebarDecisionState";

/**
 * The sidebar decision block reads a user-writable localStorage blob and wraps
 * every signed-in page. A parse failure there would white-screen the whole
 * shell, so the contract is: anything that is not a well-formed payload
 * degrades to null (the "Assess to begin" empty state) without throwing.
 */
describe("parseLatestVerdict", () => {
  it("parses a complete payload", () => {
    const raw = JSON.stringify({
      verdict: "BUILD_FIRST",
      score: 61,
      heldDays: 12,
      decisionType: "Home Buying",
    });
    expect(parseLatestVerdict(raw)).toEqual({
      verdict: "BUILD_FIRST",
      score: 61,
      heldDays: 12,
      decisionType: "Home Buying",
    });
  });

  it("keeps the verdict when the optional fields are missing", () => {
    expect(parseLatestVerdict(JSON.stringify({ verdict: "READY", score: 88 }))).toEqual({
      verdict: "READY",
      score: 88,
      heldDays: null,
      decisionType: null,
    });
  });

  it("rounds and clamps the score to the 0-100 band", () => {
    expect(parseLatestVerdict(JSON.stringify({ verdict: "READY", score: 61.4 }))?.score).toBe(61);
    expect(parseLatestVerdict(JSON.stringify({ verdict: "READY", score: 140 }))?.score).toBe(100);
    expect(parseLatestVerdict(JSON.stringify({ verdict: "NOT_YET", score: -12 }))?.score).toBe(0);
  });

  it("normalizes heldDays and drops a blank decisionType", () => {
    const raw = JSON.stringify({
      verdict: "ALMOST_THERE",
      score: 74,
      heldDays: -3.6,
      decisionType: "   ",
    });
    expect(parseLatestVerdict(raw)).toMatchObject({ heldDays: 0, decisionType: null });
  });

  it.each([
    ["null input", null],
    ["empty string", ""],
    ["malformed JSON", "{not json"],
    ["a JSON scalar", '"BUILD_FIRST"'],
    ["a JSON null", "null"],
    ["an unknown verdict", JSON.stringify({ verdict: "MAYBE", score: 61 })],
    ["a missing verdict", JSON.stringify({ score: 61 })],
    ["a non-numeric score", JSON.stringify({ verdict: "READY", score: "61" })],
    ["a NaN score", JSON.stringify({ verdict: "READY", score: null })],
  ])("returns null for %s", (_label, raw) => {
    expect(parseLatestVerdict(raw)).toBeNull();
  });
});
