import { describe, it, expect } from "vitest";
import { buildAssessmentFlow, pillarIntroCopy, getQuestionById } from "@/lib/questions/flow";
import { getQuestionsByDimension, DIMENSION_ORDER } from "@/lib/questions/bank";

/**
 * Per-vertical pillar intro copy (Plans.md 5.8).
 *
 * The contract under test: the intro never states a question count the flow
 * does not actually render, and home copy did not move when car copy arrived.
 */

describe("pillarIntroCopy", () => {
  it("keeps home copy byte-identical to the pre-5.8 fixed strings", () => {
    expect(pillarIntroCopy("financial", "home_buying")).toEqual({
      question: "Can you afford it?",
      description:
        "Fifteen questions about income, savings, debt, and credit — pulled from the canonical question bank. No judgment, just the real math.",
    });
    expect(pillarIntroCopy("emotional", "home_buying").description).toBe(
      "Fifteen questions about confidence, alignment, and readiness — honest signals, not cheerleading.",
    );
    expect(pillarIntroCopy("timing", "home_buying").description).toBe(
      "Fifteen questions about your runway, the market, and life stage — timing is its own pillar.",
    );
  });

  it("adaptive home intros use path estimates instead of Fifteen", () => {
    expect(
      pillarIntroCopy("financial", "home_buying", { pathQuestionEstimate: 8 }).description,
    ).toMatch(/^~8 questions on this path/);
    expect(
      pillarIntroCopy("emotional", "home_buying", { pathQuestionEstimate: 4 }).description,
    ).not.toContain("Fifteen");
  });

  it("defaults to home when no decision type is passed", () => {
    for (const dimension of DIMENSION_ORDER) {
      expect(pillarIntroCopy(dimension)).toEqual(pillarIntroCopy(dimension, "home_buying"));
    }
  });

  it("gives car its own financial subject, not the home one", () => {
    const car = pillarIntroCopy("financial", "car");
    expect(car.description).toContain("all-in monthly cost");
    expect(car.description).not.toContain("income, savings, debt, and credit");
    // The pillar question is decision-agnostic by design.
    expect(car.question).toBe(pillarIntroCopy("financial", "home_buying").question);
  });

  it("shares emotional and timing copy across verticals (shared bank tags)", () => {
    for (const dimension of ["emotional", "timing"] as const) {
      expect(pillarIntroCopy(dimension, "car")).toEqual(
        pillarIntroCopy(dimension, "home_buying"),
      );
    }
  });

  it("states the count the flow actually renders, for every vertical", () => {
    for (const decisionType of ["home_buying", "car"]) {
      const steps = buildAssessmentFlow(decisionType);
      for (const dimension of DIMENSION_ORDER) {
        const rendered = steps.filter(
          (s) => s.kind === "question" && getQuestionById(s.questionId)?.dimension === dimension,
        ).length;
        if (rendered === 0) continue;
        expect(getQuestionsByDimension(dimension, decisionType)).toHaveLength(rendered);
        expect(pillarIntroCopy(dimension, decisionType).description.split(" ")[0]).toBe(
          rendered === 15 ? "Fifteen" : rendered === 8 ? "Eight" : String(rendered),
        );
      }
    }
  });

  it("does not promise fifteen car financial questions (the 5.8 bug)", () => {
    expect(getQuestionsByDimension("financial", "car")).toHaveLength(8);
    expect(pillarIntroCopy("financial", "car").description).toMatch(/^Eight questions about /);
  });

  it("falls back to home copy for a vertical with no bespoke strings", () => {
    // Canon-but-unauthored vertical: copy must degrade to the default clause
    // rather than throwing or rendering "undefined".
    const copy = pillarIntroCopy("emotional", "education");
    expect(copy.description).toContain("honest signals, not cheerleading");
    expect(copy.description).not.toContain("undefined");
  });
});
