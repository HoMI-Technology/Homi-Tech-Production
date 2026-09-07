import { PILLARS } from "@/lib/brand";
import type { ResponseValue } from "@/lib/questions/bank";
import {
  DIMENSION_ORDER,
  QUESTION_BANK,
  type Dimension,
} from "@/lib/questions/bank";
import {
  getQuestionById,
  shouldShowDecisionPicker,
  type FlowStep,
} from "@/lib/questions/flow";
import { ACTIVE_DECISION_TYPES } from "@/lib/assessment/types";

/**
 * Assessment Option 1 — adaptive home_buying path.
 *
 * Same scoring brain. Different path through live bank ids only.
 * AI does not invent questions, choice values, or scoring ids.
 *
 * ET whole-pillar skip is Option 1 SoT (omit all emo_*). That is not
 * partner `solo` and not credit `unknown` → band_ignored.
 */

export const HOME_FINANCIAL_CORE_IDS = [
  "fin_income",
  "fin_debt_payments",
  "fin_dti_ratio",
  "fin_savings_total",
  "fin_down_payment",
  "fin_emergency_fund",
  "fin_credit_score",
  "fin_housing_budget",
] as const;

/** Offered when ET is on the path. emo_clarity is branch-only. */
export const HOME_EMOTIONAL_CORE_IDS = [
  "emo_confidence",
  "emo_lifestyle_ready",
  "emo_partner_alignment",
  "emo_fomo",
] as const;

export const HOME_EMOTIONAL_CLARITY_ID = "emo_clarity" as const;

export const HOME_TIMING_CORE_IDS = ["tim_timeline", "tim_urgency"] as const;

export const HOME_FINANCIAL_ENRICHMENT_IDS = [
  "fin_income_stability",
  "fin_preapproval",
  "fin_additional_income",
  "fin_closing_costs",
  "fin_maintenance_buffer",
  "fin_employment_type",
  "fin_literacy",
] as const;

export const HOME_EMOTIONAL_ENRICHMENT_IDS = [
  "emo_stress",
  "emo_commitment_fear",
  "emo_preparedness",
  "emo_support_network",
  "emo_regret_tolerance",
  "emo_compromise",
  "emo_rational_balance",
  "emo_sleep_test",
  "emo_excitement",
  "emo_past_decisions",
] as const;

export const HOME_TIMING_ENRICHMENT_IDS = [
  "tim_market_perception",
  "tim_interest_rates",
  "tim_life_stage",
  "tim_career",
  "tim_rent_vs_buy",
  "tim_lease",
  "tim_family_planning",
  "tim_seasonal",
  "tim_economic_outlook",
  "tim_area_development",
  "tim_competing_goals",
  "tim_readiness_window",
  "tim_waiting_cost",
] as const;

/**
 * Tilde estimates for progress chrome — Core path length, not the 45-question bank.
 * Financial Core is 8 ids; `fin_dti_ratio` skips when income + debt exist → ~7–8.
 */
export const HOME_PATH_ESTIMATE: Record<Dimension, number> = {
  financial: HOME_FINANCIAL_CORE_IDS.length,
  emotional: HOME_EMOTIONAL_CORE_IDS.length,
  timing: HOME_TIMING_CORE_IDS.length,
};

export type AdaptiveHomeState = {
  responses: Record<string, ResponseValue>;
  /** Whole Emotional Truth pillar omitted. Not partner solo. Not credit skip. */
  emotionalSkipped: boolean;
  activeDecisionTypes?: readonly string[];
};

export type CoverageGap =
  | "fin_income"
  | "fin_debt_or_dti"
  | "fin_down_payment"
  | "fin_emergency_fund"
  | "fin_credit_score"
  | "fin_housing_budget"
  | "fin_savings_total"
  | "emo_confidence"
  | "emo_fomo"
  | "emo_partner_alignment"
  | "emo_lifestyle_or_clarity"
  | "emo_present_while_skipped"
  | "tim_timeline"
  | "tim_urgency";

export type CoverageProof = {
  complete: boolean;
  gaps: CoverageGap[];
  emotionalSkipped: boolean;
};

function bankOrder(id: string): number {
  return getQuestionById(id)?.order_index ?? Number.MAX_SAFE_INTEGER;
}

function sortByLiveOrder(ids: readonly string[]): string[] {
  return [...ids].sort((a, b) => bankOrder(a) - bankOrder(b));
}

function num(value: ResponseValue | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * A value the user (or Money confirm → self_report) actually stored.
 * Mapper silent defaults do not count — missing keys are not answers.
 */
export function hasRealBankAnswer(
  responses: Record<string, ResponseValue>,
  id: string,
): boolean {
  if (!Object.prototype.hasOwnProperty.call(responses, id)) return false;
  const question = getQuestionById(id);
  if (!question) return false;
  const value = responses[id];
  switch (question.question_type) {
    case "number":
      return typeof value === "number" && Number.isFinite(value) && value >= 0;
    case "single_choice": {
      if (typeof value !== "string" || value.length === 0) return false;
      const options = Array.isArray(question.options) ? question.options : [];
      return options.some((option) => option.value === value);
    }
    case "slider":
      return typeof value === "number" && Number.isFinite(value);
    default: {
      const _exhaustive: never = question.question_type;
      return Boolean(_exhaustive);
    }
  }
}

export function shouldSkipDtiRatio(responses: Record<string, ResponseValue>): boolean {
  const income = num(responses.fin_income);
  if (income === null || income <= 0) return false;
  return hasRealBankAnswer(responses, "fin_debt_payments");
}

export function shouldAskClarity(responses: Record<string, ResponseValue>): boolean {
  return !hasRealBankAnswer(responses, "emo_lifestyle_ready");
}

export function offeredFinancialCoreIds(responses: Record<string, ResponseValue>): string[] {
  return sortByLiveOrder(HOME_FINANCIAL_CORE_IDS).filter((id) => {
    if (id === "fin_dti_ratio") return !shouldSkipDtiRatio(responses);
    return true;
  });
}

export function offeredEmotionalCoreIds(
  responses: Record<string, ResponseValue>,
  emotionalSkipped: boolean,
): string[] {
  if (emotionalSkipped) return [];
  // Must-offer ET core in live order_index. Clarity is not injected while
  // lifestyle_ready is still on the path — that would ask both. Ask clarity
  // only when lifestyle is missing and is no longer being offered (skipped).
  const core = sortByLiveOrder(HOME_EMOTIONAL_CORE_IDS);
  const offeringLifestyle = core.includes("emo_lifestyle_ready");
  if (!offeringLifestyle && shouldAskClarity(responses)) {
    return sortByLiveOrder([...core, HOME_EMOTIONAL_CLARITY_ID]);
  }
  return core;
}

export function offeredTimingCoreIds(): string[] {
  return sortByLiveOrder(HOME_TIMING_CORE_IDS);
}

export function stripEmotionalResponses(
  responses: Record<string, ResponseValue>,
): Record<string, ResponseValue> {
  const next: Record<string, ResponseValue> = {};
  for (const [id, value] of Object.entries(responses)) {
    if (id.startsWith("emo_")) continue;
    next[id] = value;
  }
  return next;
}

function emotionalKeysPresent(responses: Record<string, ResponseValue>): boolean {
  return Object.keys(responses).some((id) => id.startsWith("emo_"));
}

/**
 * Coverage proof for a full home_buying reading.
 * Mapper output being schema-valid is not coverage.
 */
export function proveHomeBuyingCoverage(
  responses: Record<string, ResponseValue>,
  emotionalSkipped: boolean,
): CoverageProof {
  const gaps: CoverageGap[] = [];

  if (!hasRealBankAnswer(responses, "fin_income")) gaps.push("fin_income");
  if (!hasRealBankAnswer(responses, "fin_savings_total")) gaps.push("fin_savings_total");
  if (!hasRealBankAnswer(responses, "fin_down_payment")) gaps.push("fin_down_payment");
  if (!hasRealBankAnswer(responses, "fin_emergency_fund")) gaps.push("fin_emergency_fund");
  if (!hasRealBankAnswer(responses, "fin_credit_score")) gaps.push("fin_credit_score");
  if (!hasRealBankAnswer(responses, "fin_housing_budget")) gaps.push("fin_housing_budget");

  const income = hasRealBankAnswer(responses, "fin_income") ? num(responses.fin_income) : null;
  const debtOk = hasRealBankAnswer(responses, "fin_debt_payments");
  const dtiOk = hasRealBankAnswer(responses, "fin_dti_ratio");
  const debtOrDti = debtOk || (income !== null && income <= 0 && dtiOk);
  if (!debtOrDti) gaps.push("fin_debt_or_dti");

  if (emotionalSkipped) {
    if (emotionalKeysPresent(responses)) gaps.push("emo_present_while_skipped");
  } else {
    if (!hasRealBankAnswer(responses, "emo_confidence")) gaps.push("emo_confidence");
    if (!hasRealBankAnswer(responses, "emo_fomo")) gaps.push("emo_fomo");
    if (!hasRealBankAnswer(responses, "emo_partner_alignment")) {
      gaps.push("emo_partner_alignment");
    }
    const lifestyle = hasRealBankAnswer(responses, "emo_lifestyle_ready");
    const clarity = hasRealBankAnswer(responses, HOME_EMOTIONAL_CLARITY_ID);
    if (!lifestyle && !clarity) gaps.push("emo_lifestyle_or_clarity");
  }

  if (!hasRealBankAnswer(responses, "tim_timeline")) gaps.push("tim_timeline");
  if (!hasRealBankAnswer(responses, "tim_urgency")) gaps.push("tim_urgency");

  return { complete: gaps.length === 0, gaps, emotionalSkipped };
}

export function buildAdaptiveHomeBuyingFlow(state: AdaptiveHomeState): FlowStep[] {
  const active = state.activeDecisionTypes ?? ACTIVE_DECISION_TYPES;
  const steps: FlowStep[] = [];

  if (shouldShowDecisionPicker(active)) {
    steps.push({ kind: "decision" });
  }

  steps.push({ kind: "intro", dimension: "financial" });
  for (const questionId of offeredFinancialCoreIds(state.responses)) {
    steps.push({ kind: "question", questionId });
  }

  if (!state.emotionalSkipped) {
    steps.push({ kind: "intro", dimension: "emotional" });
    for (const questionId of offeredEmotionalCoreIds(state.responses, false)) {
      steps.push({ kind: "question", questionId });
    }
  }

  steps.push({ kind: "intro", dimension: "timing" });
  for (const questionId of offeredTimingCoreIds()) {
    steps.push({ kind: "question", questionId });
  }

  steps.push({ kind: "conflict-referral" }, { kind: "conflict-deadline" }, { kind: "review" });
  return steps;
}

export function adaptiveStepCursor(step: FlowStep): string {
  switch (step.kind) {
    case "decision":
      return "decision";
    case "intro":
      return `intro:${step.dimension}`;
    case "question":
      return `question:${step.questionId}`;
    case "conflict-referral":
      return "conflict-referral";
    case "conflict-deadline":
      return "conflict-deadline";
    case "review":
      return "review";
    default: {
      const _exhaustive: never = step;
      return String(_exhaustive);
    }
  }
}

/** Canonical cursor order so a vanished branch (DTI, clarity, ET) advances forward. */
export function adaptiveCursorOrder(): string[] {
  const questionCursors = [
    ...sortByLiveOrder(HOME_FINANCIAL_CORE_IDS),
    ...sortByLiveOrder([...HOME_EMOTIONAL_CORE_IDS, HOME_EMOTIONAL_CLARITY_ID]),
    ...sortByLiveOrder(HOME_TIMING_CORE_IDS),
  ].map((id) => `question:${id}`);

  return [
    "decision",
    "intro:financial",
    ...questionCursors.filter((c) => c.startsWith("question:fin_")),
    "intro:emotional",
    ...questionCursors.filter((c) => c.startsWith("question:emo_")),
    "intro:timing",
    ...questionCursors.filter((c) => c.startsWith("question:tim_")),
    "conflict-referral",
    "conflict-deadline",
    "review",
  ];
}

export function resolveAdaptiveIndex(steps: FlowStep[], cursor: string | null): number {
  const keys = steps.map(adaptiveStepCursor);
  if (cursor) {
    const exact = keys.indexOf(cursor);
    if (exact >= 0) return exact;
    const order = adaptiveCursorOrder();
    const start = order.indexOf(cursor);
    const from = start < 0 ? 0 : start + 1;
    for (let i = from; i < order.length; i += 1) {
      const found = keys.indexOf(order[i]!);
      if (found >= 0) return found;
    }
  }
  return 0;
}

export function pathProgressLabel(
  dimension: Dimension,
  currentInPillar: number,
  estimate: number = HOME_PATH_ESTIMATE[dimension],
): string {
  const pillar = PILLARS.find((entry) => entry.key === dimension);
  const name = pillar?.name ?? dimension;
  return `${name} · ${currentInPillar} of ~${estimate} this path`;
}

export function currentPillarQuestionNumber(
  steps: FlowStep[],
  index: number,
  dimension: Dimension,
): number {
  let n = 0;
  for (let i = 0; i <= index && i < steps.length; i += 1) {
    const step = steps[i];
    if (step?.kind !== "question") continue;
    const question = getQuestionById(step.questionId);
    if (question?.dimension === dimension) n += 1;
  }
  return n;
}

export function allAdaptiveIdsAreLiveBankIds(): boolean {
  const ids = [
    ...HOME_FINANCIAL_CORE_IDS,
    ...HOME_EMOTIONAL_CORE_IDS,
    HOME_EMOTIONAL_CLARITY_ID,
    ...HOME_TIMING_CORE_IDS,
    ...HOME_FINANCIAL_ENRICHMENT_IDS,
    ...HOME_EMOTIONAL_ENRICHMENT_IDS,
    ...HOME_TIMING_ENRICHMENT_IDS,
  ];
  const live = new Set(QUESTION_BANK.map((q) => q.id));
  return ids.every((id) => live.has(id));
}

export function isSkipEligibleEnrichmentId(id: string): boolean {
  return (
    (HOME_FINANCIAL_ENRICHMENT_IDS as readonly string[]).includes(id) ||
    (HOME_EMOTIONAL_ENRICHMENT_IDS as readonly string[]).includes(id) ||
    (HOME_TIMING_ENRICHMENT_IDS as readonly string[]).includes(id)
  );
}

export { DIMENSION_ORDER };
