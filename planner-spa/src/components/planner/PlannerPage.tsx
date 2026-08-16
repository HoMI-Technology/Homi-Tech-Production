/* ------------------------------------------------------------------ */
/* PlannerPage — the five-tab Budget Planner shell (spec §0).          */
/*                                                                     */
/* Single entry point (Stage 4 wires the /planner route). Owns the     */
/* header, tab nav, hero, signals strip, nudge rail, footer, mobile    */
/* bottom strip, and the global closed-loop toast. Sibling tab         */
/* surfaces arrive as optional slots from other agents — unbuilt tabs  */
/* render a zero-shame EmptyState placeholder. Sibling tab components  */
/* are NEVER imported here.                                            */
/* ------------------------------------------------------------------ */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  Compass,
  Landmark,
  LayoutDashboard,
  LineChart,
} from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import type { SignalTab } from '@/lib/planner/signals'
import { usePlannerStore } from '@/store/planner'
import AppHeader, { PlannerFooter } from '@/components/planner/AppHeader'
import ReadinessHero, {
  fmtUsd2,
  usePlannerIsEmpty,
  usePlannerReality,
} from '@/components/planner/ReadinessHero'
import SignalsStrip from '@/components/planner/SignalsStrip'
import NudgeRail from '@/components/planner/NudgeRail'
import ImpactToast from '@/components/planner/ImpactToast'
import OverviewCommand from '@/components/planner/overview/OverviewCommand'

export type PlannerTab = SignalTab

const TABS: Array<{ id: PlannerTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'banking', label: 'Banks & bills', icon: Landmark },
  { id: 'wealth', label: 'Wealth', icon: LineChart },
  { id: 'plan', label: 'Plan', icon: Compass },
]

/* ------------------------------------------------------------------ */
/* First-visit demo seed (spec §9: demo loaded by default)             */
/* ------------------------------------------------------------------ */

/**
 * Marker key for "this device has opened the planner before". The
 * planner persist envelope is written during hydration itself, so it
 * cannot double as a first-visit signal — this marker can: it is set
 * exactly once, on the first mounted visit, and `Clear data` never
 * removes it (a cleared workspace stays honestly empty).
 */
const PLANNER_VISITED_KEY = 'homi-planner-visited-v1'

/**
 * On the very first visit load the demo so the shell lands in the §9
 * demo state. Later visits — including post-`Clear data` — never
 * reseed.
 */
function useFirstVisitDemoSeed() {
  const hydrated = usePlannerStore((s) => s._hasHydrated)
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    try {
      if (window.localStorage.getItem(PLANNER_VISITED_KEY) !== null) return
      window.localStorage.setItem(PLANNER_VISITED_KEY, new Date().toISOString())
    } catch {
      return
    }
    const s = usePlannerStore.getState()
    if (
      s.transactions.length === 0 &&
      s.accounts.length === 0 &&
      s.bills.length === 0
    ) {
      s.resetDemo()
    }
  }, [hydrated])
}

/* ------------------------------------------------------------------ */
/* Tab placeholder (sibling surfaces land here as they ship)           */
/* ------------------------------------------------------------------ */

function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="card-chrome mt-6">
      <EmptyState
        compact
        line={`${label} — this tab is being assembled.`}
        caption="The surface lands here as it ships. Your numbers are already live in the hero, signals, and Overview."
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mobile bottom strip (spec §0 — calendar & mobile views)             */
/* ------------------------------------------------------------------ */

function MobileBottomStrip({
  onNavigateTab,
}: {
  onNavigateTab: (tab: PlannerTab) => void
}) {
  const { cash, portfolio, billsOpen } = usePlannerReality()
  const isEmpty = usePlannerIsEmpty()
  if (isEmpty) return null

  const tiles = [
    { label: 'LINKED CASH', value: fmtUsd2(cash), className: 'text-emerald' },
    {
      label: 'PORTFOLIO',
      value: fmtUsd2(portfolio.marketValue),
      className: 'text-cyan',
    },
    { label: 'OPEN BILLS', value: fmtUsd2(billsOpen), className: 'text-yellow' },
  ]
  const links: Array<{ label: string; tab: PlannerTab }> = [
    { label: 'Plan', tab: 'plan' },
    { label: 'Wealth', tab: 'wealth' },
    { label: 'Banks', tab: 'banking' },
  ]

  return (
    <div className="card-chrome mt-8 p-4 lg:hidden">
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-dim">
              {tile.label}
            </p>
            <p
              className={`mt-1 font-display text-xs font-semibold tnum ${tile.className}`}
            >
              {tile.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 border-t border-white/[0.06] pt-3">
        {links.map((link) => (
          <button
            key={link.tab}
            type="button"
            onClick={() => onNavigateTab(link.tab)}
            className="text-xs font-semibold text-cyan transition-opacity hover:opacity-80"
          >
            {link.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function PlannerPage({
  calendar,
  banking,
  wealth,
  plan,
}: {
  calendar?: ReactNode
  banking?: ReactNode
  wealth?: ReactNode
  plan?: ReactNode
}) {
  const [tab, setTab] = useState<PlannerTab>('overview')
  const hydrated = usePlannerStore((s) => s._hasHydrated)
  useFirstVisitDemoSeed()

  if (!hydrated) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center"
        role="status"
        aria-label="Loading planner"
      >
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-cyan/40 border-t-cyan" />
      </div>
    )
  }

  const slots: Record<Exclude<PlannerTab, 'overview'>, ReactNode> = {
    calendar,
    banking,
    wealth,
    plan,
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      <AppHeader />

      {/* Five-tab pill nav */}
      <nav
        aria-label="Planner tabs"
        className="mt-6 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-white/[0.06] bg-slate/60 p-1"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-cyan/15 text-cyan'
                  : 'text-dim hover:bg-white/[0.04] hover:text-light'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          )
        })}
      </nav>

      <ReadinessHero />
      <SignalsStrip onNavigateTab={setTab} />
      {/* The Overview surfaces nudges inside "Suggested move" — the rail
          rides the other tabs so they are never dead surfaces. */}
      {tab !== 'overview' && <NudgeRail onNavigateTab={setTab} />}

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {tab === 'overview' ? (
          <OverviewCommand onNavigateTab={setTab} />
        ) : (
          (slots[tab] ?? (
            <TabPlaceholder label={TABS.find((t) => t.id === tab)?.label ?? ''} />
          ))
        )}
      </motion.div>

      <MobileBottomStrip onNavigateTab={setTab} />
      <PlannerFooter />
      <ImpactToast />
    </div>
  )
}

export default PlannerPage
