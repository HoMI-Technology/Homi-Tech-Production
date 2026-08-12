/**
 * Client collector for E4 data-quality confidence.
 * Assembles store freshness into the pure `computeDataQualityConfidence` input.
 * SSR-safe: returns assessment-only shape when `window` is unavailable.
 */

import { hasSavedBudgetLedger, budgetLedgerSavedAt } from "@/lib/finance/local-ledger";
import { hasSavedFinanceState, financeSavedAt } from "@/lib/finance/store";
import { hasSavedCreditState, creditSavedAt, loadCreditState } from "@/lib/credit/store";
import {
  ageDaysFromIso,
  computeDataQualityConfidence,
  type DataQualityConfidence,
  type DataQualityInput,
} from "./confidence";

function resolveFinanceAgeDays(nowMs: number): { hasFinance: boolean; financeAgeDays: number | null } {
  if (hasSavedBudgetLedger()) {
    return { hasFinance: true, financeAgeDays: ageDaysFromIso(budgetLedgerSavedAt(), nowMs) };
  }
  if (hasSavedFinanceState()) {
    return { hasFinance: true, financeAgeDays: ageDaysFromIso(financeSavedAt(), nowMs) };
  }
  return { hasFinance: false, financeAgeDays: null };
}

/** Build the pure input from local stores + assessment stamp. */
export function collectDataQualityInput(
  rawScore: number,
  assessmentCompletedAt: string | null | undefined,
  nowMs: number = Date.now(),
): DataQualityInput {
  const { hasFinance, financeAgeDays } = resolveFinanceAgeDays(nowMs);
  const hasCredit = hasSavedCreditState();
  const creditScore = hasCredit ? Math.round(loadCreditState().score) : null;

  return {
    rawScore,
    assessmentAgeDays: ageDaysFromIso(assessmentCompletedAt, nowMs),
    hasFinance,
    financeAgeDays,
    hasCredit,
    creditScore,
    financeVerified: false,
  };
}

/** Convenience: collect + compute for results / path surfaces. */
export function buildClientDataQuality(
  rawScore: number,
  assessmentCompletedAt: string | null | undefined,
  nowMs: number = Date.now(),
): DataQualityConfidence {
  return computeDataQualityConfidence(collectDataQualityInput(rawScore, assessmentCompletedAt, nowMs));
}
