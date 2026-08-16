/* ------------------------------------------------------------------ */
/* Data confidence (M2/M10 "Confidence as UI")                         */
/* Pure, deterministic. Consumed by Readiness (chip) and Trust (audit) */
/* ------------------------------------------------------------------ */

import { useMemo } from 'react'
import { useBudget } from '@/store/budget'
import { useReadinessManual } from '@/store/readiness'

export type ConfidenceLevel = 'low' | 'medium' | 'high'

export type ConfidenceFactor = {
  key: string
  label: string
  ok: boolean
  detail: string
}

export type Confidence = {
  level: ConfidenceLevel
  /** 0..1 composite */
  value: number
  factors: ConfidenceFactor[]
}

const MS_DAY = 86_400_000

function newestTransactionAgeDays(dates: string[], now: number): number {
  let newest = 0
  for (const d of dates) {
    const t = Date.parse(d)
    if (!Number.isNaN(t) && t > newest) newest = t
  }
  if (newest === 0) return Infinity
  return Math.max(0, Math.round((now - newest) / MS_DAY))
}

/**
 * Composite confidence from completeness × freshness × verification.
 * Never imputes missing data — gaps are reported, not filled.
 */
export function computeConfidence(args: {
  transactionCount: number
  hasIncomeEntries: boolean
  hasExpenseEntries: boolean
  newestTxAgeDays: number
  creditScoreSelfReported: boolean
  goalsCount: number
}): Confidence {
  const factors: ConfidenceFactor[] = []

  const completeness =
    (args.hasIncomeEntries ? 0.5 : 0) + (args.hasExpenseEntries ? 0.5 : 0)
  factors.push({
    key: 'income',
    label: 'Income entries',
    ok: args.hasIncomeEntries,
    detail: args.hasIncomeEntries
      ? 'Income recorded in your ledger'
      : 'Add income so the math has a base',
  })
  factors.push({
    key: 'expenses',
    label: 'Expense entries',
    ok: args.hasExpenseEntries,
    detail: args.hasExpenseEntries
      ? 'Spending recorded in your ledger'
      : 'Add expenses so ratios are computed, not guessed',
  })

  const freshness =
    args.newestTxAgeDays <= 30 ? 1 : args.newestTxAgeDays <= 90 ? 0.6 : 0.25
  factors.push({
    key: 'freshness',
    label: 'Data freshness',
    ok: args.newestTxAgeDays <= 30,
    detail:
      args.newestTxAgeDays <= 30
        ? 'Ledger activity within the last 30 days'
        : args.newestTxAgeDays <= 90
          ? 'Ledger is aging — refresh to sharpen your score'
          : 'Ledger is stale — your score is working from old numbers',
  })

  const volume = Math.min(1, Math.log10(1 + args.transactionCount) / 2) // ~1.0 at 100 entries
  factors.push({
    key: 'volume',
    label: 'Entry depth',
    ok: args.transactionCount >= 25,
    detail:
      args.transactionCount >= 25
        ? `${args.transactionCount} entries behind the numbers`
        : `Only ${args.transactionCount} entries — a few more sharpens the picture`,
  })

  factors.push({
    key: 'credit',
    label: 'Credit score',
    ok: !args.creditScoreSelfReported,
    detail: args.creditScoreSelfReported
      ? 'Self-reported — update it when you check your real score'
      : 'Verified source',
  })
  const creditWeight = args.creditScoreSelfReported ? 0.6 : 1

  factors.push({
    key: 'goals',
    label: 'Savings goal',
    ok: args.goalsCount > 0,
    detail:
      args.goalsCount > 0
        ? 'Progress measured against a real goal'
        : 'Set a down-payment goal so progress can be measured',
  })
  const goalWeight = args.goalsCount > 0 ? 1 : 0.5

  const value =
    0.3 * completeness + 0.25 * freshness + 0.2 * volume + 0.15 * creditWeight + 0.1 * goalWeight

  const level: ConfidenceLevel = value >= 0.75 ? 'high' : value >= 0.45 ? 'medium' : 'low'
  return { level, value: Math.round(value * 100) / 100, factors }
}

/** React hook — reads budget + readiness stores. */
export function useConfidence(): Confidence {
  const { state } = useBudget()
  const { manual } = useReadinessManual()
  return useMemo(() => {
    const dates = state.transactions.map((t) => t.date)
    return computeConfidence({
      transactionCount: state.transactions.length,
      hasIncomeEntries: state.transactions.some((t) => t.type === 'income'),
      hasExpenseEntries: state.transactions.some((t) => t.type === 'expense'),
      newestTxAgeDays: newestTransactionAgeDays(dates, Date.now()),
      creditScoreSelfReported: true, // no bureau link in local mode — always self-reported
      goalsCount: state.goals.length,
    })
  }, [state, manual])
}
