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
   * Plans.md 5.9 PHASE 2 guard (was the phase-1 guard, inverted). Both deploys
   * have landed: the server allowlist accepts "car" and the picker now offers
   * it, so the live flow MUST open on the decision step. A single-entry active
   * set here would mean the activation was reverted.
   */
  it("shows the decision picker now that car is active", () => {
    expect(ACTIVE_DECISION_TYPES).toEqual(["home_buying", "car"]);
    expect(shouldShowDecisionPicker()).toBe(true);

    const steps = buildAssessmentFlow("home_buying");
    expect(steps[0].kind).toBe("decision");
  });

  /** Launch-honesty path is still live code: one active type ⇒ no picker. */
  it("skips the decision picker when only one type is active", () => {
    const solo = ["home_buying"] as const;
    expect(shouldShowDecisionPicker(solo)).toBe(false);

    const steps = buildAssessmentFlow("home_buying", { activeDecisionTypes: solo });
    expect(steps.some((s) => s.kind === "decision")).toBe(false);
    expect(steps[0].kind).toBe("intro");
  });

  it("builds a full 3-pillar car flow behind the picker", () => {
    const steps = buildAssessmentFlow("car");
    const bankCount = getQuestionsForDecisionType("car").length;
    const questionSteps = steps.filter((s) => s.kind === "question");

    expect(bankCount).toBeGreaterThan(0);
    expect(questionSteps).toHaveLength(bankCount);
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
