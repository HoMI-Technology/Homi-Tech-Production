import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

describe("quick re-check wiring", () => {
  const flow = src("components", "assessment", "FullAssessmentFlow.tsx");
  const field = src("components", "assessment", "BankQuestionField.tsx");

  it("FullAssessmentFlow reads ?mode=quick and seeds responses from saved finance data", () => {
    expect(flow).toContain("isQuickReCheckMode");
    expect(flow).toContain("buildAssessmentPrefill");
    expect(flow).toContain("@/lib/finance/assessment-prefill");
  });

  it("marks pre-filled questions and clears the mark when the user edits", () => {
    expect(flow).toContain("prefilledIds.has(step.questionId)");
    expect(flow).toMatch(/setPrefilledIds\(\(prev\)/);
  });

  it("focuses a quick re-check on the emotional pillar", () => {
    expect(flow).toMatch(/s\.kind === "intro" && s\.dimension === "emotional"/);
  });

  it("BankQuestionField renders a pre-filled badge without touching scoring", () => {
    expect(field).toContain("prefilled");
    expect(field).toContain("Pre-filled from your saved numbers");
    expect(field).not.toContain("@/lib/scoring");
  });
});
