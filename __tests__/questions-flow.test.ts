import { describe, it, expect } from "vitest";
import {
  buildAssessmentFlow,
  getQuestionById,
  shouldShowDecisionPicker,
} from "@/lib/questions/flow";
import { getQuestionsForDecisionType } from "@/lib/questions/bank";
import { ACTIVE_DECISION_TYPES } from "@/lib/assessment/types";

describe("buildAssessmentFlow", () => {
  it("includes all 45 home_buying bank questions plus intros, conflict, and review", () => {
    const steps = buildAssessmentFlow("home_buying");
    const bankCount = getQuestionsForDecisionType("home_buying").length;
    const questionSteps = steps.filter((s) => s.kind === "question");

    expect(bankCount).toBe(45);
    expect(questionSteps).toHaveLength(45);
    expect(steps[steps.length - 1].kind).toBe("review");
  });

  /**
   * Doubles as the Plans.md 5.9 PHASE 1 guard: the server allowlist has already
   * widened to include "car", and this asserts the picker has NOT — that gap is
   * the whole point of the expand phase. Phase 2 flips this expectation to
   * ["home_buying", "car"] / true and moves the assertion to the multi-type
   * case below; until then, a picker appearing here is a premature activation.
   */
  it("skips the decision picker when only one active type (launch honesty)", () => {
    expect(ACTIVE_DECISION_TYPES).toEqual(["home_buying"]);
    expect(shouldShowDecisionPicker()).toBe(false);

    const steps = buildAssessmentFlow("home_buying");
    expect(steps.some((s) => s.kind === "decision")).toBe(false);
    expect(steps[0].kind).toBe("intro");
  });

  it("includes the decision picker when multiple types are active", () => {
    const multi = ["home_buying", "car"] as const;
    expect(shouldShowDecisionPicker(multi)).toBe(true);

    const steps = buildAssessmentFlow("home_buying", { activeDecisionTypes: multi });
    expect(steps[0].kind).toBe("decision");
  });

  it("resolves every question step to a bank entry", () => {
    const steps = buildAssessmentFlow("home_buying");
    for (const step of steps) {
      if (step.kind !== "question") continue;
      expect(getQuestionById(step.questionId)).toBeDefined();
    }
  });
});
