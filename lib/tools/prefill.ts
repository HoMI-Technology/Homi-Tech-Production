/**
 * Tool pre-loading — completes the Companion's hand-off loop: when it points
 * someone at a calculator, the calculator opens with THEIR numbers already in
 * the sliders, not illustrative defaults.
 *
 * Same honesty gate as the context spine: prefill exists only when the user
 * has actually saved finance data (hasSavedFinanceState). Otherwise the tools
 * keep their illustrative defaults, which are never presented as the user's.
 * SSR-safe; call from a mount effect.
 */

import { loadFinanceState, hasSavedFinanceState } from "@/lib/finance/store";

export interface ToolPrefill {
  monthlyIncome: number;
  annualIncome: number;
  /** Total monthly outflow: expenses + debt payments — the runway denominator. */
  monthlyOutflow: number;
  monthlyDebtPayments: number;
  liquidSavings: number;
  totalDebt: number;
}

/** The user's saved numbers for seeding calculators, or null when unsaved. */
export function getToolPrefill(): ToolPrefill | null {
  if (!hasSavedFinanceState()) return null;
  const state = loadFinanceState();
  return {
    monthlyIncome: Math.round(state.monthlyIncome),
    annualIncome: Math.round(state.monthlyIncome * 12),
    monthlyOutflow: Math.round(state.monthlyExpenses + state.monthlyDebtPayments),
    monthlyDebtPayments: Math.round(state.monthlyDebtPayments),
    liquidSavings: Math.round(state.liquidSavings),
    totalDebt: Math.round(state.totalDebt),
  };
}
