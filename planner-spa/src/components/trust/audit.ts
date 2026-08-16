/* ------------------------------------------------------------------ */
/* Input audit rows (M10) — shared by Trust (full table) and Report    */
/* (compact appendix). Every score input, its current value, where it  */
/* came from, and how fresh it is. Gaps are reported, never filled.    */
/* ------------------------------------------------------------------ */

import { useMemo } from 'react'
import { fmtPct, useBudget } from '@/store/budget'
import { useAssessmentInputs, useBudgetDerived } from '@/store/readiness'

export type AuditSource = 'computed' | 'self' | 'default'

export type AuditRow = {
  key: string
  label: string
  /** Formatted current value (mono). '—' when not set. */
  value: string
  source: AuditSource
  /** "latest entry Aug 2" for computed · "you set this" for self-reported */
  asOf: string
}

/** Source badge copy + intent, keyed by AuditSource. */
export const AUDIT_SOURCE_META: Record<AuditSource, { badge: string }> = {
  computed: { badge: 'computed from your ledger' },
  self: { badge: 'self-reported' },
  default: { badge: 'default — not set yet' },
}

function newestEntryLabel(dates: string[]): string {
  let newest = ''
  for (const d of dates) {
    if (d > newest) newest = d
  }
  if (!newest) return 'no entries yet'
  const t = new Date(`${newest}T00:00:00`)
  if (Number.isNaN(t.getTime())) return 'no entries yet'
  return `latest entry ${t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function slider(v: number): string {
  return `${v}/10`
}

/** The 11 score inputs as audit rows, in canon order. */
export function useAuditRows(): AuditRow[] {
  const inputs = useAssessmentInputs()
  const derived = useBudgetDerived()
  const { state } = useBudget()

  return useMemo(() => {
    const asOfComputed = newestEntryLabel(state.transactions.map((t) => t.date))
    const asOfSelf = 'you set this'

    const rows: AuditRow[] = [
      {
        key: 'dti',
        label: 'Debt-to-income',
        value: fmtPct(inputs.debtToIncomeRatio),
        source: 'computed',
        asOf: asOfComputed,
      },
      {
        key: 'savingsRate',
        label: 'Savings rate',
        value: fmtPct(inputs.savingsRate),
        source: 'computed',
        asOf: asOfComputed,
      },
      {
        key: 'runway',
        label: 'Emergency runway',
        value: `${inputs.emergencyFundMonths.toFixed(1)} mo`,
        source: 'computed',
        asOf: asOfComputed,
      },
      derived.hasHouseGoal
        ? {
            key: 'downPaymentProgress',
            label: 'Down-payment progress',
            value: fmtPct(inputs.downPaymentProgress),
            source: 'computed' as const,
            asOf: asOfComputed,
          }
        : {
            key: 'downPaymentProgress',
            label: 'Down-payment progress',
            value: '—',
            source: 'default' as const,
            asOf: 'no down-payment goal set',
          },
      {
        key: 'creditScore',
        label: 'Credit score',
        value: String(inputs.creditScore),
        source: 'self',
        asOf: asOfSelf,
      },
      inputs.monthlyHousingRatio !== undefined
        ? {
            key: 'housingRatio',
            label: 'Housing ratio',
            value: fmtPct(inputs.monthlyHousingRatio),
            source: 'self' as const,
            asOf: asOfSelf,
          }
        : {
            key: 'housingRatio',
            label: 'Housing ratio',
            value: '—',
            source: 'default' as const,
            asOf: 'not set yet',
          },
      {
        key: 'timeHorizon',
        label: 'Time horizon',
        value: `${inputs.timeHorizonMonths} mo`,
        source: 'self',
        asOf: asOfSelf,
      },
      {
        key: 'stability',
        label: 'Stability',
        value: slider(inputs.lifeStability),
        source: 'self',
        asOf: asOfSelf,
      },
      {
        key: 'confidence',
        label: 'Confidence',
        value: slider(inputs.confidenceLevel),
        source: 'self',
        asOf: asOfSelf,
      },
      {
        key: 'fomo',
        label: 'FOMO',
        value: slider(inputs.fomoLevel),
        source: 'self',
        asOf: asOfSelf,
      },
      {
        key: 'partnerAlignment',
        label: 'Partner alignment',
        value: inputs.partnerAlignment === null ? 'Solo' : slider(inputs.partnerAlignment),
        source: 'self',
        asOf: asOfSelf,
      },
    ]
    return rows
  }, [inputs, derived.hasHouseGoal, state.transactions])
}
