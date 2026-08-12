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

/**
 * Per-vertical pillar intro copy (Plans.md 5.8).
 *
 * The pillar QUESTION is decision-agnostic by design — "Can you afford it?"
 * reads the same for a house and a car — so only the SUBJECT clause varies.
 * Today only `financial` differs per vertical: emotional and timing questions
 * are shared bank tags across verticals (see bank.ts), so their copy is shared
 * too. `default` covers every vertical without bespoke copy.
 */
const PILLAR_QUESTION: Record<Dimension, string> = {
  financial: "Can you afford it?",
  emotional: "Do you really want it?",
  timing: "Is now the right moment?",
};

const PILLAR_SUBJECT: Record<Dimension, Record<string, string>> = {
  financial: {
    default:
      "income, savings, debt, and credit — pulled from the canonical question bank. No judgment, just the real math.",
    car: "price, down payment, and the all-in monthly cost — insurance and upkeep included. No judgment, just the real math.",
  },
  emotional: {
    default: "confidence, alignment, and readiness — honest signals, not cheerleading.",
  },
  timing: {
    default: "your runway, the market, and life stage — timing is its own pillar.",
  },
};

/** Spelled-out counts keep the brand voice; numerals are the safety net. */
const COUNT_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
  "Twenty",
];

function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

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

/**
 * Intro copy for a pillar, in the voice of the vertical being assessed.
 *
 * The question COUNT is never hardcoded — it comes from the same
 * getQuestionsByDimension() call buildAssessmentFlow() uses to lay out the
 * steps, so the intro can never promise "Fifteen questions" ahead of a pillar
 * that renders eight (car financial). Home copy is byte-identical to the
 * pre-5.8 fixed strings.
 */
export function pillarIntroCopy(
  dimension: Dimension,
  decisionType: string = "home_buying",
): { question: string; description: string } {
  const subjects = PILLAR_SUBJECT[dimension];
  const subject = subjects[decisionType] ?? subjects.default;
  const count = getQuestionsByDimension(dimension, decisionType).length;

  return {
    question: PILLAR_QUESTION[dimension],
    description: `${countWord(count)} ${count === 1 ? "question" : "questions"} about ${subject}`,
  };
}

/** Map a review "edit" target back to a step index. */
export function stepIndexForQuestion(steps: FlowStep[], questionId: string): number {
  return steps.findIndex((s) => s.kind === "question" && s.questionId === questionId);
}
