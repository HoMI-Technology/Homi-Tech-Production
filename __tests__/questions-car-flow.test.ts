import { describe, it, expect } from "vitest";
import { buildAssessmentFlow, getQuestionById } from "@/lib/questions/flow";
import { getQuestionsByDimension, getQuestionsForDecisionType } from "@/lib/questions/bank";

describe("car assessment flow", () => {
  it("car flow has all 3 pillars", () => {
    const flow = buildAssessmentFlow("car");
    const dims = new Set(flow.filter((s) => s.kind === "intro").map((s) => s.dimension));
    expect(dims.has("financial")).toBe(true);
    expect(dims.has("emotional")).toBe(true);
    expect(dims.has("timing")).toBe(true);
  });

  it("car flow has at least 8 financial questions", () => {
    const flow = buildAssessmentFlow("car");
    const finQs = flow.filter((s) => s.kind === "question");
    expect(finQs.length).toBeGreaterThanOrEqual(8);

    // Stronger form of the same claim: the financial pillar itself carries
    // >= 8 questions, not just the flow as a whole.
    const financialSteps = flow.filter(
      (s) => s.kind === "question" && getQuestionById(s.questionId)?.dimension === "financial",
    );
    expect(financialSteps.length).toBeGreaterThanOrEqual(8);
  });

  it("resolves every car question step to a bank entry", () => {
    const flow = buildAssessmentFlow("car");
    for (const step of flow) {
      if (step.kind !== "question") continue;
      expect(getQuestionById(step.questionId)).toBeDefined();
    }
  });

  it("keeps car financial questions car-only (no home_buying financial leakage)", () => {
    for (const q of getQuestionsByDimension("financial", "car")) {
      expect(q.decision_types).toEqual(["car"]);
    }
    // Home buying keeps exactly its own 15 financial questions.
    expect(getQuestionsByDimension("financial", "home_buying")).toHaveLength(15);
  });

  it("shares every emotional and timing question with home buying", () => {
    const shared = getQuestionsForDecisionType("home_buying").filter(
      (q) => q.dimension === "emotional" || q.dimension === "timing",
    );
    expect(shared).toHaveLength(30);
    for (const q of shared) {
      expect(q.decision_types).toContain("car");
    }
  });

  it("gives every car question a unique id and stable order within its dimension", () => {
    const carQs = getQuestionsForDecisionType("car");
    expect(new Set(carQs.map((q) => q.id)).size).toBe(carQs.length);

    for (const dimension of ["financial", "emotional", "timing"] as const) {
      const ordered = getQuestionsByDimension(dimension, "car").map((q) => q.order_index);
      expect(new Set(ordered).size).toBe(ordered.length);
      expect([...ordered].sort((a, b) => a - b)).toEqual(ordered);
    }
  });
});
