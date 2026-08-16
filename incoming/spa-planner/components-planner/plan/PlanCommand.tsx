import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Home,
  LineChart,
  Scale,
  Sparkles,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PlanPath from './PlanPath'
import PlanHousing from './PlanHousing'
import PlanDebt from './PlanDebt'
import PlanHousehold from './PlanHousehold'
import PlanModels from './PlanModels'
import PlanShare from './PlanShare'

/* ------------------------------------------------------------------ */
/* PlanCommand — the Plan tab (spec §7 PLAN LAB).                      */
/*                                                                     */
/* Six sub-tabs: Path / Housing / Debt / Household / Models / Share.   */
/* No routing, no shell — the planner page mounts <PlanCommand /> and  */
/* owns the outer five-tab pill nav.                                   */
/* ------------------------------------------------------------------ */

type PlanSubTab = 'path' | 'housing' | 'debt' | 'household' | 'models' | 'share'

const SUB_TABS: Array<{ id: PlanSubTab; label: string; icon: LucideIcon }> = [
  { id: 'path', label: 'Path', icon: BookOpen },
  { id: 'housing', label: 'Housing', icon: Home },
  { id: 'debt', label: 'Debt', icon: Scale },
  { id: 'household', label: 'Household', icon: Users },
  { id: 'models', label: 'Models', icon: LineChart },
  { id: 'share', label: 'Share', icon: Sparkles },
]

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function PlanCommand() {
  const [tab, setTab] = useState<PlanSubTab>('path')

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-label text-cyan">PLAN LAB</p>
        <h2 className="mt-1.5 font-serif text-[26px] italic leading-tight text-light sm:text-[30px]">
          Decision readiness tools
        </h2>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-dim">
          Path, housing, debt, dual score, Monte Carlo — every move can pulse
          the HōMI-Score.
        </p>
      </header>

      <nav
        aria-label="Plan sections"
        className="flex flex-wrap gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1"
      >
        {SUB_TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                active
                  ? 'bg-cyan/[0.12] text-cyan'
                  : 'text-dim hover:bg-white/[0.04] hover:text-light'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          )
        })}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: EASE }}
        >
          {tab === 'path' && <PlanPath />}
          {tab === 'housing' && <PlanHousing />}
          {tab === 'debt' && <PlanDebt />}
          {tab === 'household' && <PlanHousehold />}
          {tab === 'models' && <PlanModels />}
          {tab === 'share' && <PlanShare />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default PlanCommand
