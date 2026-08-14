/**
 * Packet B — /shadow-score is a 90-second read, not a score.
 * Word-locked copy and restatement helpers. No engine, no composite, no bands.
 */

import { formatNumber } from "@/lib/assessment/format";
import { TIME_HORIZON_LABELS, type TimeHorizonChoice } from "@/lib/assessment/types";

export const SHADOW_READ_TITLE = "90-second read";
export const SHADOW_READ_KICKER = "Educational. Not a verdict.";
export const SHADOW_READ_SEE_BUTTON = "See the read";
export const SHADOW_READ_SUBMITTING = "One moment";
export const SHADOW_READ_DISCLAIMER =
  "This is a read of what you just said. Educational only. Not a HōMI verdict.";
export const SHADOW_READ_PRIMARY_CTA = "Create an account, then Assess";
export const SHADOW_READ_PRIMARY_HREF = "/auth/sign-up?next=/assessment";
export const SHADOW_READ_ASSESS_HREF = "/assessment";
export const SHADOW_READ_SECONDARY_CTA = "Not now";
export const SHADOW_READ_HELPER = "The full assessment is the verdict. This was only the read.";

export const SHADOW_READ_CONFIDENCE_LOW = "Not confident";
export const SHADOW_READ_CONFIDENCE_HIGH = "Very confident";

/** The three stems this route asks. Do not invent replacements. */
export const SHADOW_READ_STEMS = ["income-debt", "confidence", "time-horizon"] as const;
export type ShadowReadStem = (typeof SHADOW_READ_STEMS)[number];

/** Existing stems this route does not ask. May remain unused elsewhere. */
export const SHADOW_READ_UNUSED_STEMS = ["emergency-fund", "credit-band", "fomo"] as const;

export const SHADOW_READ_DONE_KEY = "homi:shadow-read-done";

export interface ShadowReadDone {
  monthlyGrossIncome: number;
  monthlyDebtPayments: number;
  confidenceLevel: number;
  timeHorizonChoice: TimeHorizonChoice;
}

export function formatShadowMoney(value: number): string {
  return `$${formatNumber(value)}`;
}

/**
 * Restate the confidence slider using only its own low/high language.
 * Not a band. Not "out of 10."
 */
export function formatShadowConfidenceRead(value: number, min = 1, max = 10): string {
  if (!Number.isFinite(value) || value <= min) return SHADOW_READ_CONFIDENCE_LOW;
  if (value >= max) return SHADOW_READ_CONFIDENCE_HIGH;
  return `${SHADOW_READ_CONFIDENCE_LOW} → ${SHADOW_READ_CONFIDENCE_HIGH}`;
}

export function formatShadowHorizonRead(choice: TimeHorizonChoice): string {
  return TIME_HORIZON_LABELS[choice];
}

export function restatedIncomeDebt(income: number, debt: number): string {
  return `You put monthly income at ${formatShadowMoney(income)} and monthly debt payments at ${formatShadowMoney(debt)}.`;
}

export function restatedConfidence(confidence: string): string {
  return `On whether buying is the right move, you marked ${confidence}.`;
}

export function restatedHorizon(horizon: string): string {
  return `You’re planning to buy in ${horizon}.`;
}

export function buildShadowReadLines(answers: ShadowReadDone): {
  incomeDebt: string;
  confidence: string;
  horizon: string;
} {
  return {
    incomeDebt: restatedIncomeDebt(answers.monthlyGrossIncome, answers.monthlyDebtPayments),
    confidence: restatedConfidence(formatShadowConfidenceRead(answers.confidenceLevel)),
    horizon: restatedHorizon(formatShadowHorizonRead(answers.timeHorizonChoice)),
  };
}

function isTimeHorizonChoice(value: unknown): value is TimeHorizonChoice {
  return value === "lt3" || value === "3to6" || value === "6to12" || value === "12plus";
}

export function saveShadowReadDone(answers: ShadowReadDone): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SHADOW_READ_DONE_KEY, JSON.stringify(answers));
  } catch {
    // ignore
  }
}

export function loadShadowReadDone(): ShadowReadDone | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SHADOW_READ_DONE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ShadowReadDone> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (
      typeof parsed.monthlyGrossIncome !== "number" ||
      typeof parsed.monthlyDebtPayments !== "number" ||
      typeof parsed.confidenceLevel !== "number" ||
      !isTimeHorizonChoice(parsed.timeHorizonChoice)
    ) {
      return null;
    }
    return {
      monthlyGrossIncome: parsed.monthlyGrossIncome,
      monthlyDebtPayments: parsed.monthlyDebtPayments,
      confidenceLevel: parsed.confidenceLevel,
      timeHorizonChoice: parsed.timeHorizonChoice,
    };
  } catch {
    return null;
  }
}

export function clearShadowReadDone(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SHADOW_READ_DONE_KEY);
  } catch {
    // ignore
  }
}
