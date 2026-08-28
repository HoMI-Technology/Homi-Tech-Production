import { describe, expect, it } from "vitest";
import { sidebarVerdictNeedsWrite } from "@/components/dashboard/SidebarVerdictSync";

const next = {
  verdict: "NOT_YET" as const,
  score: 61,
  decisionType: "Home Buying",
  assessmentId: "a-2",
};

describe("sidebarVerdictNeedsWrite", () => {
  it("writes when the cache is empty", () => {
    expect(sidebarVerdictNeedsWrite(null, next)).toBe(true);
  });

  it("does not rewrite an identical payload (preserves heldDays)", () => {
    const raw = JSON.stringify({
      verdict: "NOT_YET",
      score: 61,
      heldDays: 12,
      decisionType: "Home Buying",
      assessmentId: "a-2",
    });
    expect(sidebarVerdictNeedsWrite(raw, next)).toBe(false);
  });

  it("writes when the server score moved", () => {
    const raw = JSON.stringify({
      verdict: "NOT_YET",
      score: 61,
      heldDays: 12,
      decisionType: "Home Buying",
      assessmentId: "a-1",
    });
    expect(sidebarVerdictNeedsWrite(raw, { ...next, score: 65, assessmentId: "a-1" })).toBe(true);
  });

  it("writes when a new assessment id arrives at the same score", () => {
    const raw = JSON.stringify({
      verdict: "NOT_YET",
      score: 61,
      heldDays: 12,
      decisionType: "Home Buying",
      assessmentId: "a-1",
    });
    expect(sidebarVerdictNeedsWrite(raw, next)).toBe(true);
  });
});
