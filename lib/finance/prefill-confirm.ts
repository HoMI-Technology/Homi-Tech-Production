/**
 * Client persistence for user-confirmed DTI / runway observations.
 * Confirmation overlays user-accepted numbers as self-report.
 * This packet never flips provenance to verified — the transfer
 * classifier is heuristic (Plaid writes transfers as income by sign).
 */

import type { AssessmentInputs } from "@/lib/scoring/public";

const STORAGE_KEY = "homi:finance-prefill-confirm";

export interface ConfirmedFinancePrefill {
  confirmedAt: string;
  lookbackDays: number;
  debtToIncomeRatio: number;
  emergencyFundMonths: number;
  earmarkedDownPayment: number;
  dtiVerified: boolean;
  runwayVerified: boolean;
  downPaymentEarmarked: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
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
    debtToIncomeRatio: confirmed.debtToIncomeRatio,
    emergencyFundMonths: confirmed.emergencyFundMonths,
    lookbackDays: confirmed.lookbackDays,
    dtiProvenance: "self_report",
    runwayProvenance: "self_report",
    downPaymentProvenance: confirmed.downPaymentEarmarked ? "ledger_earmark" : "self_report",
  };
}
