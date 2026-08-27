/**
 * Quick re-check prefill (`/assessment?mode=quick`).
 *
 * Seeds the assessment's financial questions from the numbers the user already
 * saved on the finance dashboard (lib/finance/store.ts), so a returning user
 * re-confirms income / debt / savings / runway instead of re-typing them, and
 * can focus on the emotional and timing questions that actually change between
 * re-checks.
 *
 * Suggestions only: every pre-filled answer stays an ordinary response the
 * user can edit, and provenance stays self_report — this module never touches
 * the confirmed-prefill overlay (prefill-confirm.ts) or the frozen scoring
 * engine. The mapping feeds the canonical bank responses, so
 * bankResponsesToInputs produces a complete AssessmentInputs exactly as it
 * does for hand-typed answers.
 *
 * SSR-safe: reads are guarded behind `typeof window` via store.ts.
 */

import {
  hasSavedFinanceState,
  loadFinanceState,
  runwayMonths,
  type FinanceState,
} from "@/lib/finance/store";
import type { ResponseValue } from "@/lib/questions/bank";

export interface AssessmentPrefill {
  /** Bank question id → suggested answer, ready to merge into flow responses. */
  responses: Record<string, ResponseValue>;
  /** Ids whose values came from saved finance data — the UI marks these. */
  questionIds: string[];
}

/** Home bank F5 choices: 6_plus / 4_5 / 2_3 / 1 / none. */
function homeEmergencyChoice(months: number): string {
  if (months >= 6) return "6_plus";
  if (months >= 4) return "4_5";
  if (months >= 2) return "2_3";
  if (months >= 0.75) return "1";
  return "none";
}

/** Car bank choices reuse the shared EmergencyFundChoice values. */
function carEmergencyChoice(months: number): string {
  if (months >= 6) return "6plus";
  if (months >= 3) return "3to6";
  if (months >= 1) return "1to3";
  return "lt1";
}

/**
 * Pure mapping from saved finance numbers to bank responses for every active
 * vertical (home + car share the dashboard numbers; only the chosen
 * vertical's questions render, so seeding both costs nothing).
 *
 * Number questions only count as answered above zero (isQuestionAnswered), so
 * a zero is never pre-filled — it would read as unanswered and block Next,
 * which is worse than asking. Emergency-runway choices are always suggested:
 * any saved state yields a defensible band.
 */
export function financeStateToPrefill(state: FinanceState): AssessmentPrefill {
  const responses: Record<string, ResponseValue> = {};
  const questionIds: string[] = [];
  const put = (id: string, value: ResponseValue) => {
    responses[id] = value;
    questionIds.push(id);
  };

  if (state.monthlyIncome > 0) {
    put("fin_income", state.monthlyIncome);
    put("car_fin_income", state.monthlyIncome);
  }
  if (state.monthlyDebtPayments > 0) {
    put("fin_debt_payments", state.monthlyDebtPayments);
    put("car_fin_debt_payments", state.monthlyDebtPayments);
  }
  if (state.liquidSavings > 0) {
    put("fin_savings_total", state.liquidSavings);
  }

  // Runway = liquid savings / total monthly outflow. No outflow (Infinity)
  // reads as the top band — you cannot outrun expenses you do not have.
  const months = runwayMonths(state);
  const runway = Number.isFinite(months) ? months : 12;
  put("fin_emergency_fund", homeEmergencyChoice(runway));
  put("car_fin_emergency_fund", carEmergencyChoice(runway));

  return { responses, questionIds };
}

/**
 * Client-side entry point for the assessment flow. Returns null when the user
 * has never saved finance numbers — quoting the store's placeholder defaults
 * back to them as "your numbers" would be a lie (see hasSavedFinanceState).
 */
export function buildAssessmentPrefill(): AssessmentPrefill | null {
  if (!hasSavedFinanceState()) return null;
  const prefill = financeStateToPrefill(loadFinanceState());
  return prefill.questionIds.length > 0 ? prefill : null;
}

/** Whether the current URL asks for a quick re-check. Client-only. */
export function isQuickReCheckMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("mode") === "quick";
  } catch {
    return false;
  }
}
