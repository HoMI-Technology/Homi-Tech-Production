import { describe, it, expect } from "vitest";
import { buildAssessmentFlow, getQuestionById } from "@/lib/questions/flow";
import { getQuestionsForDecisionType } from "@/lib/questions/bank";

describe("buildAssessmentFlow", () => {
  it("includes all 45 home_buying bank questions plus decision, intros, conflict, and review", () => {
    const steps = buildAssessmentFlow("home_buying");
    const bankCount = getQuestionsForDecisionType("home_buying").length;
    const questionSteps = steps.filter((s) => s.kind === "question");

    expect(bankCount).toBe(45);
    expect(questionSteps).toHaveLength(45);
    expect(steps[0].kind).toBe("decision");
    expect(steps[steps.length - 1].kind).toBe("review");
  });

  it("resolves every question step to a bank entry", () => {
    const steps = buildAssessmentFlow("home_buying");
    for (const step of steps) {
      if (step.kind !== "question") continue;
      expect(getQuestionById(step.questionId)).toBeDefined();
    }
  });
});
