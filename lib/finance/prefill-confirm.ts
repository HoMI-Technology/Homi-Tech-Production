/**
 * Client persistence for user-confirmed Money / linked observations.
 * Confirmation overlays user-accepted numbers as self-report.
 * This packet never flips provenance to verified — transfers still count
 * as income by sign, so canVerify stays false.
 *
 * Suggested responses may only carry live IDs from docs/MEASURE_ACT_W1.md.
 * No invented IDs. Never credit, ET, PT, or fin_dti_ratio when income+debt exist.
 */

import type { ResponseValue } from "@/lib/questions/bank";
import type { AssessmentInputs } from "@/lib/scoring/public";
import {
  isAllowedPrefillQuestionId,
  type DownPaymentQuestionChoice,
  type EmergencyFundQuestionChoice,
  type QuestionPrefillSuggestions,
} from "@/lib/finance/observed-prefill";

const STORAGE_KEY = "homi:finance-prefill-confirm";

export interface ConfirmedQuestionResponses {
  fin_income?: number;
  fin_debt_payments?: number;
  fin_savings_total?: number;
  fin_emergency_fund?: EmergencyFundQuestionChoice;
  fin_down_payment?: DownPaymentQuestionChoice;
}

export interface ConfirmedFinancePrefill {
  confirmedAt: string;
  lookbackDays: number;
  debtToIncomeRatio: number;
  emergencyFundMonths: number;
  earmarkedDownPayment: number;
  dtiVerified: boolean;
  runwayVerified: boolean;
  downPaymentEarmarked: boolean;
  /** False when the confirm had no income/debt pair. Old records default true. */
  dtiPresent?: boolean;
  /** False when runway could not be derived. Old records default true. */
  runwayPresent?: boolean;
  suggestedResponses?: ConfirmedQuestionResponses;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

const EF_CHOICES = new Set<EmergencyFundQuestionChoice>([
  "6_plus",
  "4_5",
  "2_3",
  "1",
  "none",
]);

const DP_CHOICES = new Set<DownPaymentQuestionChoice>([
  "20_plus",
  "15_19",
  "10_14",
  "5_9",
  "3_4",
  "less_3",
]);

export function sanitizeSuggestedResponses(
  raw: unknown,
): ConfirmedQuestionResponses | undefined {
  if (!isRecord(raw)) return undefined;
  const next: ConfirmedQuestionResponses = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isAllowedPrefillQuestionId(key)) continue;
    if (key === "fin_emergency_fund") {
      if (typeof value === "string" && EF_CHOICES.has(value as EmergencyFundQuestionChoice)) {
        next.fin_emergency_fund = value as EmergencyFundQuestionChoice;
      }
      continue;
    }
    if (key === "fin_down_payment") {
      if (typeof value === "string" && DP_CHOICES.has(value as DownPaymentQuestionChoice)) {
        next.fin_down_payment = value as DownPaymentQuestionChoice;
      }
      continue;
    }
    if (key === "fin_dti_ratio") {
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      if (key === "fin_income") next.fin_income = value;
      if (key === "fin_debt_payments") next.fin_debt_payments = value;
      if (key === "fin_savings_total") next.fin_savings_total = value;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function suggestedResponsesFromQuestions(
  suggestions: QuestionPrefillSuggestions,
): ConfirmedQuestionResponses | undefined {
  return sanitizeSuggestedResponses({
    fin_income: suggestions.fin_income,
    fin_debt_payments: suggestions.fin_debt_payments,
    fin_savings_total: suggestions.fin_savings_total,
    fin_emergency_fund: suggestions.fin_emergency_fund,
    fin_down_payment: suggestions.fin_down_payment,
  });
}

export function loadConfirmedFinancePrefill(): ConfirmedFinancePrefill | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (typeof parsed.confirmedAt !== "string") return null;
    if (typeof parsed.lookbackDays !== "number") return null;
    if (typeof parsed.debtToIncomeRatio !== "number") return null;
    if (typeof parsed.emergencyFundMonths !== "number") return null;
    if (typeof parsed.earmarkedDownPayment !== "number") return null;
    return {
      confirmedAt: parsed.confirmedAt,
      lookbackDays: parsed.lookbackDays,
      debtToIncomeRatio: parsed.debtToIncomeRatio,
      emergencyFundMonths: parsed.emergencyFundMonths,
      earmarkedDownPayment: parsed.earmarkedDownPayment,
      dtiVerified: parsed.dtiVerified === true,
      runwayVerified: parsed.runwayVerified === true,
      downPaymentEarmarked: parsed.downPaymentEarmarked === true,
      dtiPresent: parsed.dtiPresent !== false,
      runwayPresent: parsed.runwayPresent !== false,
      suggestedResponses: sanitizeSuggestedResponses(parsed.suggestedResponses),
    };
  } catch {
    return null;
  }
}

export function saveConfirmedFinancePrefill(value: ConfirmedFinancePrefill): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Quota / private mode — in-memory confirm still happened this session.
  }
}

export function clearConfirmedFinancePrefill(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Overlay confirmed linked ratios onto mapped assessment inputs. */
export function applyConfirmedFinancePrefill(inputs: AssessmentInputs): AssessmentInputs {
  const confirmed = loadConfirmedFinancePrefill();
  if (!confirmed) return inputs;
  return {
    ...inputs,
    ...(confirmed.dtiPresent !== false
      ? { debtToIncomeRatio: confirmed.debtToIncomeRatio }
      : {}),
    ...(confirmed.runwayPresent !== false
      ? { emergencyFundMonths: confirmed.emergencyFundMonths }
      : {}),
    lookbackDays: confirmed.lookbackDays,
    dtiProvenance: "self_report",
    runwayProvenance: "self_report",
    downPaymentProvenance: confirmed.downPaymentEarmarked ? "ledger_earmark" : "self_report",
    creditScoreProvenance: inputs.creditScoreProvenance ?? "band_ignored",
  };
}

/**
 * Prefill live Money question IDs onto a retake. Never writes ET / PT / credit.
 * Existing answers win — suggestions fill blanks only.
 */
export function applyConfirmedQuestionPrefill(
  responses: Record<string, ResponseValue>,
  confirmed: ConfirmedFinancePrefill | null = loadConfirmedFinancePrefill(),
): Record<string, ResponseValue> {
  if (!confirmed?.suggestedResponses) return responses;
  const next = { ...responses };
  const suggested = sanitizeSuggestedResponses(confirmed.suggestedResponses);
  if (!suggested) return next;
  if (suggested.fin_income != null && next.fin_income === undefined) {
    next.fin_income = suggested.fin_income;
  }
  if (suggested.fin_debt_payments != null && next.fin_debt_payments === undefined) {
    next.fin_debt_payments = suggested.fin_debt_payments;
  }
  if (suggested.fin_savings_total != null && next.fin_savings_total === undefined) {
    next.fin_savings_total = suggested.fin_savings_total;
  }
  if (suggested.fin_emergency_fund != null && next.fin_emergency_fund === undefined) {
    next.fin_emergency_fund = suggested.fin_emergency_fund;
  }
  if (suggested.fin_down_payment != null && next.fin_down_payment === undefined) {
    next.fin_down_payment = suggested.fin_down_payment;
  }
  const incomeFilled = next.fin_income !== undefined;
  const debtFilled = next.fin_debt_payments !== undefined;
  if (incomeFilled && debtFilled) {
    delete next.fin_dti_ratio;
  }
  return next;
}

export function buildConfirmedFinancePrefill(input: {
  lookbackDays: number;
  suggestions: QuestionPrefillSuggestions;
  earmarkedDownPayment?: number;
}): ConfirmedFinancePrefill {
  const income = input.suggestions.fin_income;
  const debt = input.suggestions.fin_debt_payments;
  const dtiPresent = income != null && income > 0 && debt != null;
  const runwayPresent = input.suggestions.fin_emergency_fund != null;
  const earmark = Math.max(0, input.earmarkedDownPayment ?? 0);
  return {
    confirmedAt: new Date().toISOString(),
    lookbackDays: input.lookbackDays,
    debtToIncomeRatio: dtiPresent && income ? Math.min(1, debt / income) : 0,
    emergencyFundMonths: runwayMonthsFromChoice(input.suggestions.fin_emergency_fund),
    earmarkedDownPayment: earmark,
    dtiVerified: false,
    runwayVerified: false,
    downPaymentEarmarked: earmark > 0,
    dtiPresent,
    runwayPresent,
    suggestedResponses: suggestedResponsesFromQuestions(input.suggestions),
  };
}

function runwayMonthsFromChoice(choice: EmergencyFundQuestionChoice | null): number {
  switch (choice) {
    case "6_plus":
      return 6;
    case "4_5":
      return 4.5;
    case "2_3":
      return 2.5;
    case "1":
      return 1;
    case "none":
      return 0.25;
    default: {
      const _exhaustive: EmergencyFundQuestionChoice | null = choice;
      void _exhaustive;
      return 0;
    }
  }
}
