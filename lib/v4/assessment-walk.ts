/**
 * Assessment v4 walk — Option 1 adaptive home_buying in Shell v4.
 * Bank ids and scoring stay in lib/questions + lib/scoring. This module
 * is chrome + fixture + HōMI prompts only.
 */

import { DECISION_TYPE_LABELS } from "@/lib/assessment/types";
import { PILLARS } from "@/lib/brand";
import type { Dimension } from "@/lib/questions/bank";
import { getQuestionById } from "@/lib/questions/flow";
import {
  HOME_PATH_ESTIMATE,
  buildAdaptiveHomeBuyingFlow,
  currentPillarQuestionNumber,
  pathProgressLabel,
  resolveAdaptiveIndex,
  type AdaptiveHomeState,
} from "@/lib/questions/adaptive-home";
import {
  V4_SHELL_ASSESS_HREF,
  V4_SHELL_HOME_HREF,
  V4_SHELL_MONEY_HREF,
  V4_SHELL_PATH_HREF,
} from "@/lib/layout/v4-shell";

export const V4_ASSESS_VERTICAL = "home_buying" as const;
export const V4_ASSESS_VERTICALS = [V4_ASSESS_VERTICAL] as const;
export const V4_ASSESS_DECISION_LABEL = DECISION_TYPE_LABELS[V4_ASSESS_VERTICAL];
export const V4_ASSESS_HREF = V4_SHELL_ASSESS_HREF;
export const V4_ASSESS_DONE_HREF = V4_SHELL_HOME_HREF;

export const V4_ASK_PLACEHOLDER_DEFAULT = "Ask HōMI";
export const V4_ASK_PLACEHOLDER_DECISION = "Ask HōMI about this decision...";
export const V4_ASK_PLACEHOLDER_QUESTION = "Ask HōMI about this question...";
export const V4_ASK_PLACEHOLDER_FINANCIAL = "Ask HōMI about this financial picture...";
export const V4_ASK_PLACEHOLDER_COMPARE = "Ask HōMI about this comparison...";
export const V4_ASK_PLACEHOLDER_READINESS = "Ask HōMI about this readiness...";
export const V4_ASK_PLACEHOLDER_PATH = "Ask HōMI about this path...";
export const V4_ASK_PLACEHOLDER_BILLS = "Ask HōMI about these bills...";
export const V4_ASK_PLACEHOLDER_TOOLS = "Ask HōMI about these tools...";
export const V4_ASK_PLACEHOLDER_LEARN = "Ask HōMI about this learning...";
export const V4_ASK_PLACEHOLDER_ACCOUNTS = "Ask HōMI about these accounts...";
export const V4_ASK_PLACEHOLDER_SETTINGS = "Ask HōMI about these settings...";

export const V4_ASSESS_VISUAL_STATES = ["pillar-intro", "mid-walk"] as const;
export type V4AssessVisualState = (typeof V4_ASSESS_VISUAL_STATES)[number];

export function parseV4AssessVisualState(
  raw: string | null | undefined,
): V4AssessVisualState | null {
  if (!raw) return null;
  return (V4_ASSESS_VISUAL_STATES as readonly string[]).includes(raw)
    ? (raw as V4AssessVisualState)
    : null;
}

export type V4AssessHomiPrompt = {
  label: string;
  href: string;
};

export const V4_ASSESS_HOMI_COMPARE: V4AssessHomiPrompt = {
  label: "Compare without a second score",
  href: "/scenarios",
};

const PATH_LENGTH_PROMPT: V4AssessHomiPrompt = {
  label: "Why path length can change",
  href: V4_SHELL_HOME_HREF,
};

export const V4_ASSESS_HOMI_QUESTION_DEFAULT: readonly V4AssessHomiPrompt[] = [
  { label: "How does this affect runway?", href: V4_SHELL_PATH_HREF },
  V4_ASSESS_HOMI_COMPARE,
];

/** Live bank id — mock orientation used this question; labels stay in bank.ts. */
export const V4_ASSESS_MID_WALK_QUESTION_ID = "fin_down_payment" as const;
export const V4_ASSESS_MID_WALK_VALUE = "5_9" as const;

const HOMI_BY_QUESTION: Record<string, readonly V4AssessHomiPrompt[]> = {
  [V4_ASSESS_MID_WALK_QUESTION_ID]: [
    { label: "Why does down payment matter?", href: V4_SHELL_MONEY_HREF },
    { label: "How does this affect runway?", href: V4_SHELL_PATH_HREF },
    V4_ASSESS_HOMI_COMPARE,
  ],
};

export function assessmentHomiPrompts(args: {
  kind: "intro" | "question" | "other";
  dimension?: Dimension | null;
  questionId?: string;
}): readonly V4AssessHomiPrompt[] {
  if (args.kind === "intro" && args.dimension) {
    const name = PILLARS.find((pillar) => pillar.key === args.dimension)?.name ?? args.dimension;
    return [
      { label: `What is ${name}?`, href: V4_SHELL_HOME_HREF },
      PATH_LENGTH_PROMPT,
      V4_ASSESS_HOMI_COMPARE,
    ];
  }
  if (args.kind === "question") {
    const mapped = args.questionId ? HOMI_BY_QUESTION[args.questionId] : undefined;
    return mapped ?? V4_ASSESS_HOMI_QUESTION_DEFAULT;
  }
  return [V4_ASSESS_HOMI_COMPARE];
}

export function assessmentAskPlaceholder(kind: "intro" | "question" | "other"): string {
  return kind === "question" ? V4_ASK_PLACEHOLDER_QUESTION : V4_ASK_PLACEHOLDER_DECISION;
}

export function emptyAdaptiveHomeState(): AdaptiveHomeState {
  return {
    responses: {},
    emotionalSkipped: false,
    activeDecisionTypes: V4_ASSESS_VERTICALS,
  };
}

export function v4AssessFixtureProgress(questionId: string): {
  dimension: Dimension;
  label: string;
  current: number;
  estimate: number;
} | null {
  const question = getQuestionById(questionId);
  if (!question) return null;
  const steps = buildAdaptiveHomeBuyingFlow(emptyAdaptiveHomeState());
  const index = resolveAdaptiveIndex(steps, `question:${questionId}`);
  const current = currentPillarQuestionNumber(steps, index, question.dimension);
  const estimate = HOME_PATH_ESTIMATE[question.dimension];
  return {
    dimension: question.dimension,
    current,
    estimate,
    label: pathProgressLabel(question.dimension, current, estimate),
  };
}
