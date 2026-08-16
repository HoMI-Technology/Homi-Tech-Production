import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { Holding } from '@/store/budget'
import { fmt } from '@/store/budget'
import Sparkline from './Sparkline'
import { isCashHolding } from './investUtils'
import { cn } from '@/lib/utils'

/** Movers strip — mini-cards sorted by |day Δ| desc (investments.md §7). */
export default function MoversStrip({
  holdings,
  onSelect,
}: {
  holdings: Holding[]
  onSelect: (h: Holding) => void
}) {
  const movers = useMemo(() => {
    return holdings
      .filter((h) => !isCashHolding(h))
      .map((h) => {
        const pct = h.prevClose > 0 ? (h.price - h.prevClose) / h.prevClose : 0
        return { h, pct }
      })
      .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
  }, [holdings])

  if (movers.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.24 }}
      className="col-span-12"
    >
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-h2">Today's movers</h2>
        <p className="text-xs text-dim">Simulated prices · demo data</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {movers.map(({ h, pct }, i) => {
          const up = pct >= 0
          return (
            <motion.button
              key={h.id}
              layout
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                layout: { type: 'spring', stiffness: 220, damping: 26 },
                opacity: { duration: 0.3, delay: i * 0.05 },
                x: { duration: 0.3, delay: i * 0.05 },
              }}
              whileHover={{ y: -2 }}
              onClick={() => onSelect(h)}
              className="card-chrome w-[180px] shrink-0 p-3 text-left transition-colors hover:border-white/[0.12]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-light">{h.ticker}</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    up ? 'bg-emerald/10 text-emerald' : 'bg-crimson/10 text-crimson',
                  )}
                >
                  {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {up ? '+' : '−'}
                  {Math.abs(pct * 100).toFixed(2)}%
                </span>
              </div>
              <p className="text-data-sm mt-1.5 text-light">{fmt(h.price, 2)}</p>
              <div className="mt-2">
                <Sparkline values={h.history.slice(-14)} width={56} height={24} className="!h-6 !w-full" />
              </div>
            </motion.button>
          )
        })}
      </div>
    </motion.section>
  )
}
