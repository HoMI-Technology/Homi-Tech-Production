/* ------------------------------------------------------------------ */
/* SignalsStrip — always-on protective signals (spec §2).              */
/*                                                                     */
/* Severity-ranked (crimson → emerald), deduped, capped at 6 by the    */
/* engine (lib/planner/signals.ts — verbatim owner copy). Cards are    */
/* severity-tinted, dismissible, and deep-link into a planner tab.     */
/* ------------------------------------------------------------------ */

import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import { derivePlannerSignals, SIGNAL_SEVERITY_CLASS } from '@/lib/planner/signals'
import type { PlannerSignal, SignalTab } from '@/lib/planner/signals'
import { scoreFromBudget } from '@/lib/planner/score-bridge'
import { usePlannerStore } from '@/store/planner'
import { usePlannerReality } from '@/components/planner/ReadinessHero'

/* ------------------------------------------------------------------ */
/* Shared signal derivation                                            */
/* ------------------------------------------------------------------ */

/** Live severity-ranked signals (engine already filters dismissals). */
export function usePlannerSignals(): PlannerSignal[] {
  const { reality, portfolio, nw } = usePlannerReality()
  const transactions = usePlannerStore((s) => s.transactions)
  const accounts = usePlannerStore((s) => s.accounts)
  const bills = usePlannerStore((s) => s.bills)
  const holdings = usePlannerStore((s) => s.holdings)
  const netWorthItems = usePlannerStore((s) => s.netWorthItems)
  const savingsGoal = usePlannerStore((s) => s.savingsGoal)
  const readinessProfile = usePlannerStore((s) => s.readinessProfile)
  const path = usePlannerStore((s) => s.path)
  const dismissedSignals = usePlannerStore((s) => s.dismissedSignals)
  const checkins = usePlannerStore((s) => s.checkins)

  return useMemo(() => {
    const assessment = scoreFromBudget({
      transactions,
      accounts,
      bills,
      holdings,
      netWorthItems,
      savingsGoal,
      readinessProfile,
    })
    return derivePlannerSignals({
      income: reality.income,
      cashFlow: reality.cashFlow,
      savingsRate: reality.savingsRate,
      runwayMonths: reality.runwayMonths,
      dti: reality.dti,
      bills,
      path,
      assessment,
      portfolioValue: portfolio.marketValue,
      netWorth: nw.netWorth,
      dismissedIds: dismissedSignals,
      checkins,
    })
  }, [
    reality,
    portfolio,
    nw,
    transactions,
    accounts,
    bills,
    holdings,
    netWorthItems,
    savingsGoal,
    readinessProfile,
    path,
    dismissedSignals,
    checkins,
  ])
}

/* ------------------------------------------------------------------ */
/* Strip                                                               */
/* ------------------------------------------------------------------ */

export default function SignalsStrip({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: SignalTab) => void
}) {
  const signals = usePlannerSignals()
  const dismissSignal = usePlannerStore((s) => s.dismissSignal)

  return (
    <section className="mt-6" aria-label="Always-on signals">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-label uppercase tracking-widest text-dim">
          Always-on signals
        </span>
        <span className="font-display text-[11px] font-medium tnum text-dim">
          {signals.length} active · stress · cash · path
        </span>
      </div>

      <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-1">
        <AnimatePresence initial={false}>
          {signals.map((signal) => {
            const tone = SIGNAL_SEVERITY_CLASS[signal.severity]
            return (
              <motion.article
                key={signal.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`relative w-[290px] shrink-0 rounded-2xl border p-4 ${tone.border} ${tone.bg}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone.border} ${tone.text}`}
                  >
                    {signal.meta ?? signal.kind}
                  </span>
                  <button
                    type="button"
                    onClick={() => dismissSignal(signal.id)}
                    aria-label={`Dismiss signal: ${signal.title}`}
                    className="rounded-md p-1 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
                  >
                    <X size={13} />
                  </button>
                </div>
                <h3 className="mt-2.5 text-sm font-semibold text-light">
                  {signal.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-dim">
                  {signal.body}
                </p>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab(signal.actionTab)}
                    className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold ${tone.text} transition-opacity hover:opacity-80`}
                  >
                    {signal.actionLabel}
                    <ArrowRight size={12} />
                  </button>
                )}
              </motion.article>
            )
          })}
        </AnimatePresence>
      </div>
    </section>
  )
}
