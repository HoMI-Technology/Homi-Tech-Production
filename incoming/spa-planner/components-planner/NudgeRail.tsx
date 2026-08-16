/* ------------------------------------------------------------------ */
/* NudgeRail — behavioral nudges, capped at 4 (lib/planner/nudges.ts). */
/*                                                                     */
/* Protective techniques only: if–then plans, micro-commitments,       */
/* fresh-start, identity, protect-the-decision, progress, partner      */
/* sync. Never dark patterns, never fake urgency.                      */
/* ------------------------------------------------------------------ */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { deriveBehaviorNudges, NUDGE_KIND_LABEL } from '@/lib/planner/nudges'
import type { BehaviorNudge, NudgeTab } from '@/lib/planner/nudges'
import { analyzeStress } from '@/lib/planner/stress'
import { scoreFromBudget } from '@/lib/planner/score-bridge'
import { usePlannerStore } from '@/store/planner'
import { usePlannerReality } from '@/components/planner/ReadinessHero'

/* ------------------------------------------------------------------ */
/* Shared nudge derivation                                             */
/* ------------------------------------------------------------------ */

/** Live ranked nudges (engine dedupes + caps at 4). */
export function useBehaviorNudges(): BehaviorNudge[] {
  const { reality } = usePlannerReality()
  const transactions = usePlannerStore((s) => s.transactions)
  const accounts = usePlannerStore((s) => s.accounts)
  const bills = usePlannerStore((s) => s.bills)
  const holdings = usePlannerStore((s) => s.holdings)
  const netWorthItems = usePlannerStore((s) => s.netWorthItems)
  const savingsGoal = usePlannerStore((s) => s.savingsGoal)
  const readinessProfile = usePlannerStore((s) => s.readinessProfile)
  const householdPartner = usePlannerStore((s) => s.householdPartner)
  const path = usePlannerStore((s) => s.path)
  const checkins = usePlannerStore((s) => s.checkins)
  const lastImpact = usePlannerStore((s) => s.lastImpact)

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
    return deriveBehaviorNudges({
      assessment,
      bills,
      path,
      stress: analyzeStress(checkins),
      cashFlow: reality.cashFlow,
      runwayMonths: reality.runwayMonths,
      savingsRate: reality.savingsRate,
      lastScoreDelta: lastImpact?.delta ?? null,
      partnerAlignment: householdPartner.enabled
        ? householdPartner.partnerAlignment
        : readinessProfile.partnerAlignment,
    })
  }, [
    reality,
    transactions,
    accounts,
    bills,
    holdings,
    netWorthItems,
    savingsGoal,
    readinessProfile,
    householdPartner,
    path,
    checkins,
    lastImpact,
  ])
}

/* ------------------------------------------------------------------ */
/* Rail                                                                */
/* ------------------------------------------------------------------ */

export default function NudgeRail({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: NudgeTab) => void
}) {
  const nudges = useBehaviorNudges()
  if (nudges.length === 0) return null

  return (
    <section className="mt-6" aria-label="Protective nudges">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {nudges.map((nudge, i) => (
          <motion.article
            key={nudge.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: 'easeOut' }}
            className="card-chrome flex flex-col p-4"
          >
            <span className="w-fit rounded-full border border-cyan/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan">
              {nudge.chip ?? NUDGE_KIND_LABEL[nudge.kind]}
            </span>
            <h3 className="mt-2.5 text-sm font-semibold text-light">
              {nudge.title}
            </h3>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-dim">
              {nudge.body}
            </p>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab(nudge.actionTab)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan transition-opacity hover:opacity-80"
              >
                {nudge.actionLabel}
                <ArrowRight size={12} />
              </button>
            )}
          </motion.article>
        ))}
      </div>
    </section>
  )
}
