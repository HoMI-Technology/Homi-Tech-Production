import { useMemo } from 'react'
import {
  liquidSavings,
  monthExpenses,
  monthlySeries,
  netCashFlow,
  portfolioValue,
  useBudget,
} from '@/store/budget'

/* ------------------------------------------------------------------ */
/* Ledger seeds — pre-fill tool inputs from the user's real numbers.   */
/* ------------------------------------------------------------------ */

export type LedgerSeeds = {
  /** Average monthly income across the last 6 ledger months, ×12. */
  annualIncome: number
  /** Average monthly income across the last 6 ledger months. */
  monthlyIncome: number
  /** Recurring monthly debt payments from the ledger. */
  monthlyDebts: number
  /** Total outstanding debt from the ledger. */
  totalDebt: number
  /** Current-month expenses + debt payments. */
  monthlyOutflow: number
  /** High-yield cash + goal savings. */
  liquidSavings: number
  /** Saved toward the house down-payment goal (undefined when no house goal). */
  downPaymentSaved?: number
  /** Current-month net cash flow (can be negative). */
  monthlyCashFlow: number
  /** Invested portfolio value (excludes cash). */
  invested: number
}

export function useLedgerSeeds(): LedgerSeeds {
  const { state } = useBudget()
  return useMemo(() => {
    const series = monthlySeries(state, 6)
    const avgIncome = series.reduce((s, p) => s + p.income, 0) / Math.max(1, series.length)
    const houseGoal =
      state.goals.find((g) => g.id === 'goal-house') ??
      state.goals.find((g) => /house|down.?payment/i.test(g.name))
    return {
      annualIncome: Math.round(avgIncome * 12),
      monthlyIncome: Math.round(avgIncome),
      monthlyDebts: state.monthlyDebtPayments,
      totalDebt: state.totalDebt,
      monthlyOutflow: monthExpenses(state, 0) + state.monthlyDebtPayments,
      liquidSavings: liquidSavings(state),
      downPaymentSaved: houseGoal?.saved,
      monthlyCashFlow: netCashFlow(state, 0),
      invested: portfolioValue(state),
    }
  }, [state])
}
