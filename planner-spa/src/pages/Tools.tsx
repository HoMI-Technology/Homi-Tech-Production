import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { TOOL_CARDS } from '@/components/tools/registry'
import type { ToolId } from '@/components/tools/registry'
import { useLedgerSeeds } from '@/components/tools/seeds'
import {
  AffordabilityPanel,
  AprPanel,
  HelocPanel,
  LoanProgramsPanel,
  RefinancePanel,
} from '@/components/tools/HousingPanels'
import { BlindBudgetPanel, DebtPayoffPanel } from '@/components/tools/StabilityPanels'
import { FirePanel, MonteCarloPanel, RothPanel } from '@/components/tools/TimingPanels'
import type { LedgerSeeds } from '@/components/tools/seeds'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

function ActivePanel({ id, seeds, desc }: { id: ToolId; seeds: LedgerSeeds; desc: string }) {
  switch (id) {
    case 'affordability':
      return <AffordabilityPanel seeds={seeds} desc={desc} />
    case 'apr-compare':
      return <AprPanel seeds={seeds} desc={desc} />
    case 'refinance':
      return <RefinancePanel seeds={seeds} desc={desc} />
    case 'heloc':
      return <HelocPanel seeds={seeds} desc={desc} />
    case 'loan-programs':
      return <LoanProgramsPanel seeds={seeds} desc={desc} />
    case 'debt-payoff':
      return <DebtPayoffPanel seeds={seeds} desc={desc} />
    case 'monte-carlo':
      return <MonteCarloPanel seeds={seeds} desc={desc} />
    case 'fire':
      return <FirePanel seeds={seeds} desc={desc} />
    case 'roth-conversion':
      return <RothPanel seeds={seeds} desc={desc} />
    case 'blind-budget':
      return <BlindBudgetPanel seeds={seeds} desc={desc} />
  }
}

/**
 * Decision tools — /tools. The canonical HōMI lens suite: ten calculators
 * ported verbatim from canon math, pre-filled from the ledger where sensible.
 */
export default function Tools() {
  const seeds = useLedgerSeeds()
  const [active, setActive] = useState<ToolId>('affordability')
  const activeCard = TOOL_CARDS.find((t) => t.id === active) ?? TOOL_CARDS[0]

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-6 sm:px-6">
      {/* header */}
      <header className="mb-6">
        <p className="text-label">HōMI lens suite</p>
        <h1 className="text-h1 mt-1.5">Decision tools</h1>
        <p className="mt-2 max-w-[560px] font-serif text-[17px] italic leading-relaxed text-dim">
          Ten honest calculators on the canonical math — explore the levers before you sign, bid, or stretch.
        </p>
      </header>

      {/* registry grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {TOOL_CARDS.map((tool, i) => {
          const Icon = tool.icon
          const selected = tool.id === active
          return (
            <motion.button
              key={tool.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03, ease: EASE }}
              onClick={() => setActive(tool.id)}
              aria-pressed={selected}
              className="group flex flex-col rounded-2xl border p-4 text-left transition-colors"
              style={{
                borderColor: selected ? `${tool.accent}59` : 'rgba(255,255,255,0.06)',
                backgroundColor: selected ? `${tool.accent}0d` : 'rgba(30,41,59,0.6)',
              }}
            >
              <span className="flex items-center justify-between">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${tool.accent}1a`, color: tool.accent }}
                >
                  <Icon size={15} />
                </span>
                <ChevronRight
                  size={14}
                  className="text-dim transition-transform group-hover:translate-x-0.5"
                  style={selected ? { color: tool.accent, transform: 'rotate(90deg)' } : undefined}
                />
              </span>
              <span className="mt-3 text-[13px] font-bold text-light">{tool.name}</span>
              <span className="mt-1 text-[11px] leading-snug text-dim">{tool.desc}</span>
            </motion.button>
          )
        })}
      </div>

      {/* active panel */}
      <div className="mt-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
          >
            <ActivePanel id={active} seeds={seeds} desc={activeCard.desc} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
