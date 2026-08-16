/* ------------------------------------------------------------------ */
/* ReadinessHero — the live HōMI-Score top card (spec §1).             */
/*                                                                     */
/* Every number is derived from the planner store through the canon    */
/* bridge (lib/planner/score-bridge → lib/score). The hero also hosts  */
/* the shared `usePlannerScore` hook + money/date formatters the other */
/* planner shell components import, so the derivation lives in exactly */
/* one place.                                                          */
/* ------------------------------------------------------------------ */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { HARD_STOP_MESSAGES } from '@/lib/score'
import type { VerdictKey } from '@/lib/score'
import { scoreFromBudget, toPlannerScore } from '@/lib/planner/score-bridge'
import type { PlannerScore } from '@/lib/planner/score-bridge'
import {
  financialReality,
  summarizeAccounts,
  summarizePortfolio,
  totalNetWorth,
  upcomingBillsTotal,
} from '@/lib/planner/derived'
import { usePlannerStore } from '@/store/planner'

/* ------------------------------------------------------------------ */
/* Shared derived-data hooks                                           */
/* ------------------------------------------------------------------ */

/** Live planner score — canon engine output projected for views. */
export function usePlannerScore(): PlannerScore {
  const transactions = usePlannerStore((s) => s.transactions)
  const accounts = usePlannerStore((s) => s.accounts)
  const bills = usePlannerStore((s) => s.bills)
  const holdings = usePlannerStore((s) => s.holdings)
  const netWorthItems = usePlannerStore((s) => s.netWorthItems)
  const savingsGoal = usePlannerStore((s) => s.savingsGoal)
  const readinessProfile = usePlannerStore((s) => s.readinessProfile)

  return useMemo(
    () =>
      toPlannerScore(
        scoreFromBudget({
          transactions,
          accounts,
          bills,
          holdings,
          netWorthItems,
          savingsGoal,
          readinessProfile,
        }),
      ),
    [
      transactions,
      accounts,
      bills,
      holdings,
      netWorthItems,
      savingsGoal,
      readinessProfile,
    ],
  )
}

/** Live finance aggregates (gauges + hero tiles). */
export function usePlannerReality() {
  const transactions = usePlannerStore((s) => s.transactions)
  const accounts = usePlannerStore((s) => s.accounts)
  const bills = usePlannerStore((s) => s.bills)
  const holdings = usePlannerStore((s) => s.holdings)
  const netWorthItems = usePlannerStore((s) => s.netWorthItems)

  return useMemo(() => {
    const reality = financialReality(transactions, accounts, bills)
    const { cash } = summarizeAccounts(accounts)
    const portfolio = summarizePortfolio(holdings)
    const nw = totalNetWorth(accounts, holdings, netWorthItems)
    const billsOpen = upcomingBillsTotal(bills)
    return { reality, cash, portfolio, nw, billsOpen }
  }, [transactions, accounts, bills, holdings, netWorthItems])
}

/** True when the workspace has no user-entered data (empty state). */
export function usePlannerIsEmpty(): boolean {
  const transactions = usePlannerStore((s) => s.transactions)
  const accounts = usePlannerStore((s) => s.accounts)
  const bills = usePlannerStore((s) => s.bills)
  return (
    transactions.length === 0 && accounts.length === 0 && bills.length === 0
  )
}

/* ------------------------------------------------------------------ */
/* Shared formatters (Intl instances are module-scoped, created once)  */
/* ------------------------------------------------------------------ */

const USD0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const USD2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const fmtUsd0 = (n: number): string => USD0.format(n)
export const fmtUsd2 = (n: number): string => USD2.format(n)
export const fmtSignedUsd0 = (n: number): string =>
  `${n >= 0 ? '+' : '−'}${USD0.format(Math.abs(n))}`

/** "Aug 1" from an ISO day string — noon-anchored, never UTC-shifted. */
export function fmtDayShort(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ------------------------------------------------------------------ */
/* Verdict display (spec §1 — canon 4-tier keys, owner display copy)   */
/* ------------------------------------------------------------------ */

const VERDICT_DISPLAY: Record<
  VerdictKey,
  { chip: string; label: string; chipClass: string; labelClass: string }
> = {
  READY: {
    chip: '✦ READY',
    label: 'Ready',
    chipClass: 'border-emerald/40 text-emerald',
    labelClass: 'text-emerald',
  },
  ALMOST_THERE: {
    chip: '✦ ALMOST',
    label: 'Almost there',
    chipClass: 'border-emerald/40 text-emerald',
    labelClass: 'text-emerald',
  },
  BUILD_FIRST: {
    chip: '✦ BUILD FIRST',
    label: 'Build first',
    chipClass: 'border-yellow/40 text-yellow',
    labelClass: 'text-yellow',
  },
  NOT_YET: {
    chip: '✦ NOT YET',
    label: 'Not yet',
    chipClass: 'border-crimson/40 text-crimson',
    labelClass: 'text-crimson',
  },
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const PILLAR_BARS: Array<{ key: 'financial' | 'emotional' | 'timing'; label: string }> = [
  { key: 'financial', label: 'FINANCIAL' },
  { key: 'emotional', label: 'EMOTIONAL' },
  { key: 'timing', label: 'TIMING' },
]

export default function ReadinessHero() {
  const planner = usePlannerScore()
  const { reality, cash, portfolio, nw, billsOpen } = usePlannerReality()

  const hardStopActive = planner.hardStops.length > 0
  const verdict = VERDICT_DISPLAY[planner.verdict]

  const tiles: Array<{ label: string; value: string; className: string }> = [
    {
      label: 'CASH FLOW',
      value: fmtSignedUsd0(reality.cashFlow),
      className: reality.cashFlow >= 0 ? 'text-emerald' : 'text-crimson',
    },
    { label: 'INCOME', value: fmtUsd0(reality.income), className: 'text-emerald' },
    { label: 'SPENT', value: fmtUsd0(reality.expenses), className: 'text-light' },
    {
      label: 'SAVED',
      value: `${Math.round(reality.savingsRate)}%`,
      className: 'text-cyan',
    },
    { label: 'BANK CASH', value: fmtUsd2(cash), className: 'text-cyan' },
    {
      label: 'PORTFOLIO',
      value: fmtUsd2(portfolio.marketValue),
      className: 'text-cyan',
    },
    { label: 'NET WORTH', value: fmtUsd2(nw.netWorth), className: 'text-cyan' },
    { label: 'BILLS OPEN', value: fmtUsd2(billsOpen), className: 'text-yellow' },
    {
      label: 'RUNWAY',
      value: Number.isFinite(reality.runwayMonths)
        ? `${reality.runwayMonths.toFixed(1)} mo`
        : '∞',
      className: 'text-emerald',
    },
    {
      label: 'DTI',
      value: `${Math.round(reality.dti)}%`,
      className: 'text-emerald',
    },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="card-chrome card-hairline-top relative mt-6 p-5 sm:p-7"
      aria-label="HōMI-Score readiness summary"
    >
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left — score, verdict, summary, pillar bars */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-label uppercase tracking-widest text-cyan">
              HōMI-Score
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${verdict.chipClass}`}
            >
              {verdict.chip}
            </span>
            {hardStopActive && (
              <span className="rounded-full border border-crimson/40 px-2.5 py-0.5 text-[11px] font-semibold text-crimson">
                ⛨ HARD-STOP
              </span>
            )}
          </div>

          <div className="mt-4 flex items-end gap-4">
            <span className="text-hero-number text-light">
              {Math.round(planner.score)}
            </span>
            <div className="pb-1.5">
              <p className={`font-serif text-2xl italic ${verdict.labelClass}`}>
                {verdict.label}
              </p>
              <p className="mt-0.5 text-xs text-dim">
                of 100 · live from your numbers
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-dim">
            {planner.keyInsight}
          </p>

          {hardStopActive && (
            <div className="mt-4 rounded-xl border border-crimson/30 bg-crimson/10 p-4">
              <p className="text-sm leading-relaxed text-light">
                {HARD_STOP_MESSAGES[planner.hardStops[0]]}
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {PILLAR_BARS.map(({ key, label }) => {
              const pct = planner.pillarPct[key]
              return (
                <div key={key}>
                  <div className="flex items-center justify-between">
                    <span className="text-label">{label}</span>
                    <span className="font-display text-xs font-medium tnum text-dim">
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      className="h-full rounded-full bg-cyan shadow-glow-cyan"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right — 10-tile grid (2-col) */}
        <div className="grid grid-cols-2 content-start gap-3">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="rounded-xl border border-white/[0.06] bg-navyLight/60 px-4 py-3"
            >
              <p className="text-label">{tile.label}</p>
              <p
                className={`mt-1.5 font-display text-lg font-semibold tnum ${tile.className}`}
              >
                {tile.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
