import { ACTIVE_DECISION_TYPES } from "@/lib/assessment/types";
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

const PILLAR_INTRO: Record<Dimension, { question: string; description: string }> = {
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
 * Whether the assessment flow should show a decision-type picker.
 * With a single live vertical (launch: home buying only), skip the step and
 * auto-set that type in the UI — never surface inactive "Coming soon" cards.
 */
export function shouldShowDecisionPicker(
  activeTypes: readonly string[] = ACTIVE_DECISION_TYPES,
): boolean {
  return activeTypes.length !== 1;
}

/**
 * Builds the ordered step list for a decision type from the canonical question
 * bank: optional decision picker → pillar intros → one step per bank question →
 * optional conflict checks → review.
 *
 * When only one decision type is active, the picker is omitted (caller forces
 * that type). Pass `activeDecisionTypes` to override the product default
 * (tests / multi-vertical previews).
 */
export function buildAssessmentFlow(
  decisionType: string,
  opts?: { activeDecisionTypes?: readonly string[] },
): FlowStep[] {
  const active = opts?.activeDecisionTypes ?? ACTIVE_DECISION_TYPES;
  const steps: FlowStep[] = [];

  if (shouldShowDecisionPicker(active)) {
    steps.push({ kind: "decision" });
  }

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
