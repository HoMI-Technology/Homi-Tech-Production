import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Pencil, Trash2, X } from 'lucide-react'
import type { Holding } from '@/store/budget'
import { fmt, fmtPct, fmtSigned } from '@/store/budget'
import PerformanceChart from './PerformanceChart'
import { holdingSeries, isCashHolding, round2, tickerColor } from './investUtils'
import { cn } from '@/lib/utils'

/** Holding detail drawer — right slide-over 420px (investments.md §5). */
export default function HoldingDrawer({
  holdingId,
  holdings,
  totalValue,
  onClose,
  onEdit,
  onDelete,
}: {
  holdingId: string | null
  holdings: Holding[]
  totalValue: number
  onClose: () => void
  onEdit: (h: Holding) => void
  onDelete: (h: Holding) => void
}) {
  const holding = holdings.find((h) => h.id === holdingId) ?? null

  useEffect(() => {
    if (!holdingId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [holdingId, onClose])

  return (
    <AnimatePresence>
      {holding && (
        <motion.div
          key="hd-underlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] bg-navyLight/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.aside
            key="hd-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="absolute inset-y-0 right-0 flex w-[min(420px,100vw)] flex-col overflow-y-auto border-l border-white/[0.1] bg-navyLight shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-start justify-between p-5 pb-0">
              <div>
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: tickerColor(holding.ticker, 0) }}
                  />
                  <h3 className="font-display text-2xl font-bold tracking-tight text-light">{holding.ticker}</h3>
                </div>
                <p className="mt-1 text-xs text-dim">{holding.name}</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* price + day chip */}
            <DrawerPrice holding={holding} />

            {/* chart */}
            <div className="px-5 pt-2">
              <PerformanceChart
                computeSeries={(days) => holdingSeries(holding, days)}
                costBasis={round2(holding.shares * holding.avgCost)}
                height={200}
                idSuffix={`drawer-${holding.id}`}
                yOrientation="right"
              />
            </div>

            {/* stat grid */}
            <DrawerStats holding={holding} totalValue={totalValue} />

            {/* footer */}
            <div className="mt-auto flex gap-2 border-t border-white/[0.06] p-5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onClose()
                  onEdit(holding)
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-light transition-colors hover:bg-white/[0.06]"
              >
                <Pencil size={14} /> Edit
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onClose()
                  onDelete(holding)
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-crimson/30 bg-crimson/10 px-4 py-2.5 text-sm font-semibold text-crimson transition-colors hover:bg-crimson/20"
              >
                <Trash2 size={14} /> Delete
              </motion.button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DrawerPrice({ holding }: { holding: Holding }) {
  const dayDelta = holding.price - holding.prevClose
  const dayPct = holding.prevClose > 0 ? dayDelta / holding.prevClose : 0
  const up = dayDelta >= 0
  return (
    <div className="flex items-end gap-3 px-5 pt-4">
      <span className="font-display text-3xl font-bold tracking-tight text-light tnum">{fmt(holding.price, 2)}</span>
      <span
        className={cn(
          'mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
          up ? 'bg-emerald/10 text-emerald' : 'bg-crimson/10 text-crimson',
        )}
      >
        {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {fmtSigned(dayDelta, 2)} · {up ? '+' : '−'}
        {Math.abs(dayPct * 100).toFixed(2)}%
      </span>
    </div>
  )
}

function DrawerStats({ holding, totalValue }: { holding: Holding; totalValue: number }) {
  const value = holding.shares * holding.price
  const cost = holding.shares * holding.avgCost
  const dayDelta = holding.shares * (holding.price - holding.prevClose)
  const gain = value - cost
  const gainPct = cost > 0 ? gain / cost : 0
  const weight = totalValue > 0 ? value / totalValue : 0
  const cash = isCashHolding(holding)

  const stats: { label: string; value: string; cls?: string }[] = [
    { label: 'Shares', value: holding.shares.toLocaleString('en-US', { maximumFractionDigits: 4 }) },
    { label: 'Avg cost', value: fmt(holding.avgCost, 2) },
    { label: 'Cost basis', value: fmt(cost, 2) },
    { label: 'Value', value: fmt(value, 2) },
    { label: 'Day Δ', value: fmtSigned(dayDelta, 2), cls: dayDelta >= 0 ? 'text-emerald' : 'text-crimson' },
    {
      label: 'Total return',
      value: cash ? '—' : `${fmtSigned(gain, 2)} (${gain >= 0 ? '+' : '−'}${fmtPct(Math.abs(gainPct))})`,
      cls: cash ? 'text-dim' : gain >= 0 ? 'text-emerald' : 'text-crimson',
    },
    { label: 'Weight', value: fmtPct(weight) },
    { label: '30d range', value: `${fmt(Math.min(...holding.history), 2)} – ${fmt(Math.max(...holding.history), 2)}` },
  ]

  return (
    <div className="mx-5 mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.06]">
      {stats.map((s) => (
        <div key={s.label} className="bg-navyLight px-3.5 py-2.5">
          <p className="text-label !text-[9px]">{s.label}</p>
          <p className={cn('text-data-sm mt-1 text-light', s.cls)}>{s.value}</p>
        </div>
      ))}
    </div>
  )
}
