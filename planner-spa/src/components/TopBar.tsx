import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Menu, Plus } from 'lucide-react'
import { monthLabel, useBudget } from '@/store/budget'
import { useTransactionModal } from '@/components/TransactionModal'

/* -------- extras slot: pages can inject right-side controls (e.g. search) -------- */

type ExtrasContextValue = { extras: ReactNode; setExtras: (node: ReactNode) => void }
const ExtrasContext = createContext<ExtrasContextValue | null>(null)

/** Wrap the app content (Layout) so any page can inject controls into the TopBar. */
export function TopBarExtrasProvider({ children }: { children: ReactNode }) {
  const [extras, setExtras] = useState<ReactNode>(null)
  const value = useMemo(() => ({ extras, setExtras }), [extras])
  return <ExtrasContext.Provider value={value}>{children}</ExtrasContext.Provider>
}

/** Pages call this to render controls (search, filters) inside the TopBar's right side. */
export function useTopBarExtras(node: ReactNode) {
  const ctx = useContext(ExtrasContext)
  useEffect(() => {
    ctx?.setExtras(node)
    return () => ctx?.setExtras(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, node])
}

/* -------- view metadata -------- */

const VIEW_META: Record<string, { title: string; description: string }> = {
  '/': { title: 'Overview', description: 'Your money at a glance — live from your ledger.' },
  '/readiness': {
    title: 'Readiness',
    description: 'Your HōMI-Score — Financial Reality, Emotional Truth, Perfect Timing.',
  },
  '/buildpath': {
    title: 'Build Path',
    description: 'Finite modules, each with a definition of done. This is the part we build first.',
  },
  '/assessment': {
    title: 'Assessment',
    description: 'Forty-five questions. Three pillars. One honest number.',
  },
  '/rehearse': {
    title: 'Rehearse',
    description: 'Practice the decision before you live it.',
  },
  '/genome': {
    title: 'Behavioral Genome',
    description: 'The patterns underneath the numbers.',
  },
  '/tools': {
    title: 'Decision Tools',
    description: 'Educational estimates only — pre-filled from your ledger.',
  },
  '/partner': {
    title: 'Partner',
    description: 'Two people, one decision — private answers, shared math.',
  },
  '/trust': {
    title: 'Trust & Data',
    description: 'Your numbers live here. Nowhere else. Export or erase them any time.',
  },
  '/pricing': {
    title: 'Pricing',
    description: 'Aligned, or it doesn\u2019t ship. No offer walls — ever.',
  },
  '/transactions': { title: 'Transactions', description: 'Every entry in your ledger — searchable, editable, undoable.' },
  '/investments': { title: 'Investments', description: 'Portfolio value, allocation and performance — updated live.' },
  '/goals': { title: 'Goals & Analytics', description: 'Savings goals and your HōMI readiness temperature.' },
}

/** Sticky per-view top bar — design.md §6.2. */
export default function TopBar({ onMenu }: { onMenu: () => void }) {
  const location = useLocation()
  const { monthOffset, shiftMonth } = useBudget()
  const { openAddModal } = useTransactionModal()
  const extrasCtx = useContext(ExtrasContext)
  const directionRef = useRef(1)

  const meta = VIEW_META[location.pathname] ?? VIEW_META['/']
  const label = monthLabel(monthOffset)

  const shift = (delta: number) => {
    directionRef.current = delta
    shiftMonth(delta)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-navy/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4 lg:px-10">
        <button
          onClick={onMenu}
          className="rounded-lg p-2 text-dim transition-colors hover:bg-white/[0.06] hover:text-light md:hidden"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="min-w-0 flex-1"
        >
          <h1 className="text-h1">{meta.title}</h1>
          <p className="mt-0.5 truncate text-sm text-dim">{meta.description}</p>
        </motion.div>

        {extrasCtx?.extras}

        {/* month selector pill (hidden on /readiness — the score is current-state, not month-filtered) */}
        {location.pathname !== '/readiness' && (
        <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
          <button
            onClick={() => shift(-1)}
            className="rounded-full p-1.5 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
            aria-label="Previous month"
          >
            <ChevronLeft size={15} />
          </button>
          <div className="relative w-[128px] overflow-hidden text-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={label}
                initial={{ opacity: 0, x: 12 * directionRef.current }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 * directionRef.current }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="block text-[13px] font-medium text-light"
              >
                {label}
              </motion.span>
            </AnimatePresence>
          </div>
          <button
            onClick={() => shift(1)}
            disabled={monthOffset === 0}
            className="rounded-full p-1.5 text-dim transition-colors hover:bg-white/[0.06] hover:text-light disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Next month"
          >
            <ChevronRight size={15} />
          </button>
          {monthOffset === 0 && (
            <span className="ml-0.5 flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald" />
              Live
            </span>
          )}
        </div>
        )}

        {/* global add */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => openAddModal()}
          className="flex items-center gap-1.5 rounded-xl bg-cyan px-3.5 py-2 text-sm font-semibold text-navy shadow-glow-cyan"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Add transaction</span>
          <span className="sm:hidden">Add</span>
        </motion.button>
      </div>
    </header>
  )
}
