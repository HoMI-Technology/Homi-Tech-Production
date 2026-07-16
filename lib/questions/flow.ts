import {
  DIMENSION_ORDER,
  getQuestionsByDimension,
  QUESTION_BANK,
  type Dimension,
  type Question,
} from "@/lib/questions/bank";

export type FlowStep =
  | { kind: "decision" }
  | { kind: "intro"; dimension: Dimension }
  | { kind: "question"; questionId: string }
  | { kind: "conflict-referral" }
  | { kind: "conflict-deadline" }
  | { kind: "review" };

const PILLAR_INTRO: Record<
  Dimension,
  { question: string; description: string }
> = {
  financial: {
    question: "Can you afford it?",
    description:
      "Fifteen questions about income, savings, debt, and credit — pulled from the canonical question bank. No judgment, just the real math.",
  },
  emotional: {
    question: "Do you really want it?",
    description:
      "Fifteen questions about confidence, alignment, and readiness — honest signals, not cheerleading.",
  },
  timing: {
    question: "Is now the right moment?",
    description:
      "Fifteen questions about your runway, the market, and life stage — timing is its own pillar.",
  },
};

/** Lookup a question by id from the offline bank mirror. */
export function getQuestionById(id: string): Question | undefined {
  return QUESTION_BANK.find((q) => q.id === id);
}

/**
 * Builds the ordered step list for a decision type from the canonical question
 * bank: decision picker → pillar intros → one step per bank question →
 * optional conflict checks → review.
 */
export function buildAssessmentFlow(decisionType: string): FlowStep[] {
  const steps: FlowStep[] = [{ kind: "decision" }];

  for (const dimension of DIMENSION_ORDER) {
    const questions = getQuestionsByDimension(dimension, decisionType);
    if (questions.length === 0) continue;

    steps.push({ kind: "intro", dimension });
    for (const q of questions) {
      steps.push({ kind: "question", questionId: q.id });
    }
  }

  steps.push({ kind: "conflict-referral" }, { kind: "conflict-deadline" }, { kind: "review" });
  return steps;
}

export function pillarIntroCopy(dimension: Dimension): { question: string; description: string } {
  return PILLAR_INTRO[dimension];
}

/** Map a review "edit" target back to a step index. */
export function stepIndexForQuestion(steps: FlowStep[], questionId: string): number {
  return steps.findIndex((s) => s.kind === "question" && s.questionId === questionId);
}
