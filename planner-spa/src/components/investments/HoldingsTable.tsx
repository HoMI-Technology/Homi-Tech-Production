import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import type { Holding } from '@/store/budget'
import { fmt, fmtSigned, fmtTime } from '@/store/budget'
import Sparkline from './Sparkline'
import { isCashHolding, tickerColor } from './investUtils'
import { cn } from '@/lib/utils'

type SortKey = 'price' | 'value' | 'gain'
type Sort = { key: SortKey; dir: 1 | -1 }

/** Holdings table — investments.md §5. Sortable, live-ticking, clickable rows. */
export default function HoldingsTable({
  holdings,
  flash,
  savedAt,
  onSelect,
  onEdit,
  onDelete,
}: {
  holdings: Holding[]
  /** Per-holding tick direction from the latest price refresh. */
  flash: Record<string, 'up' | 'down'>
  savedAt: string
  onSelect: (h: Holding) => void
  onEdit: (h: Holding) => void
  onDelete: (h: Holding) => void
}) {
  const [sort, setSort] = useState<Sort>({ key: 'value', dir: -1 })

  const rows = useMemo(() => {
    const metric = (h: Holding): number => {
      if (sort.key === 'price') return h.price
      if (sort.key === 'gain') return h.shares * (h.price - h.avgCost)
      return h.shares * h.price
    }
    return [...holdings].sort((a, b) => (metric(a) - metric(b)) * sort.dir)
  }, [holdings, sort])

  const totals = useMemo(() => {
    let value = 0
    let gain = 0
    for (const h of holdings) {
      value += h.shares * h.price
      if (!isCashHolding(h)) gain += h.shares * (h.price - h.avgCost)
    }
    return { value, gain }
  }, [holdings])

  const cycleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === -1 ? 1 : -1 } : { key, dir: -1 }))
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.18 }}
      className="card-chrome col-span-12 flex min-w-0 flex-col lg:col-span-8"
    >
      <div className="flex items-baseline justify-between px-5 pt-5">
        <h2 className="text-h2">Holdings</h2>
        <p className="text-xs text-dim">
          {holdings.length} position{holdings.length === 1 ? '' : 's'} · updated {fmtTime(savedAt)}
        </p>
      </div>

      <div className="mt-3 overflow-x-auto pb-2">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <Th className="sticky left-0 z-10 bg-[#131f31] pl-5 text-left">Ticker</Th>
              <Th className="text-right">Shares</Th>
              <Th className="text-right">Avg cost</Th>
              <SortTh label="Price" sortKey="price" sort={sort} onSort={cycleSort} />
              <Th className="text-right">Day Δ</Th>
              <SortTh label="Value" sortKey="value" sort={sort} onSort={cycleSort} />
              <SortTh label="Gain/Loss" sortKey="gain" sort={sort} onSort={cycleSort} />
              <Th className="text-right">Spark</Th>
              <Th className="w-[72px] pr-5 text-right"> </Th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((h, i) => (
                <HoldingRow
                  key={h.id}
                  holding={h}
                  index={i}
                  color={tickerColor(h.ticker, i)}
                  flashDir={flash[h.id]}
                  onSelect={onSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </AnimatePresence>
          </tbody>
          <tfoot>
            <tr className="border-t border-white/[0.1] bg-white/[0.02]">
              <td className="sticky left-0 z-10 bg-[#17222f] py-3 pl-5 text-xs font-semibold uppercase tracking-wider text-dim">
                Total
              </td>
              <td colSpan={4} />
              <td className="text-data-sm py-3 pr-3 text-right font-semibold text-light">{fmt(totals.value, 2)}</td>
              <td
                className={cn(
                  'text-data-sm py-3 pr-3 text-right font-semibold',
                  totals.gain >= 0 ? 'text-emerald' : 'text-crimson',
                )}
              >
                {fmtSigned(totals.gain, 2)}
              </td>
              <td colSpan={2} className="pr-5" />
            </tr>
          </tfoot>
        </table>
      </div>
    </motion.section>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn('text-label px-3 py-2.5 font-semibold', className)}>{children}</th>
}

function SortTh({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sort: Sort
  onSort: (k: SortKey) => void
}) {
  const active = sort.key === sortKey
  return (
    <th className="px-3 py-2.5 text-right">
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          'text-label inline-flex items-center gap-1 transition-colors',
          active ? 'text-cyan' : 'hover:text-light',
        )}
      >
        {label}
        <ChevronDown
          size={11}
          className={cn('transition-transform duration-200', active ? 'opacity-100' : 'opacity-30', active && sort.dir === 1 && 'rotate-180')}
        />
      </button>
    </th>
  )
}

function HoldingRow({
  holding: h,
  index,
  color,
  flashDir,
  onSelect,
  onEdit,
  onDelete,
}: {
  holding: Holding
  index: number
  color: string
  flashDir?: 'up' | 'down'
  onSelect: (h: Holding) => void
  onEdit: (h: Holding) => void
  onDelete: (h: Holding) => void
}) {
  const value = h.shares * h.price
  const gain = h.shares * (h.price - h.avgCost)
  const gainPct = h.avgCost > 0 ? (h.price - h.avgCost) / h.avgCost : 0
  const dayDelta = h.price - h.prevClose
  const dayPct = h.prevClose > 0 ? dayDelta / h.prevClose : 0
  const cash = isCashHolding(h)
  const up = dayDelta >= 0

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        layout: { type: 'spring', stiffness: 200, damping: 28 },
        opacity: { duration: 0.25, delay: Math.min(index * 0.04, 0.3) },
        y: { duration: 0.25, delay: Math.min(index * 0.04, 0.3) },
      }}
      onClick={() => onSelect(h)}
      className="group relative cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
    >
      {/* ticker */}
      <td className="sticky left-0 z-10 bg-[#131f31] py-3 pl-5 pr-3 group-hover:bg-[#18242f]">
        <div className="flex items-center gap-2.5">
          <span className="h-7 w-[2px] rounded-full opacity-0 transition-opacity group-hover:opacity-100" style={{ backgroundColor: color }} />
          <div className="-ml-1 group-hover:ml-0">
            <p className="text-sm font-semibold text-light">{h.ticker}</p>
            <p className="max-w-[180px] truncate text-xs text-dim">{h.name}</p>
          </div>
        </div>
      </td>
      {/* shares */}
      <td className="text-data-sm px-3 py-3 text-right text-dim">
        {h.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}
      </td>
      {/* avg cost */}
      <td className="text-data-sm px-3 py-3 text-right text-dim">{fmt(h.avgCost, 2)}</td>
      {/* price — flashes tick color on refresh */}
      <td className="px-3 py-3 text-right">
        <span
          className={cn(
            'text-data-sm text-light transition-colors duration-500',
            flashDir === 'up' && 'text-emerald',
            flashDir === 'down' && 'text-crimson',
          )}
        >
          {fmt(h.price, 2)}
        </span>
      </td>
      {/* day Δ chip */}
      <td className="px-3 py-3 text-right">
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
            up ? 'bg-emerald/10 text-emerald' : 'bg-crimson/10 text-crimson',
          )}
        >
          {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {up ? '+' : '−'}
          {Math.abs(dayPct * 100).toFixed(2)}%
        </span>
      </td>
      {/* value */}
      <td className="text-data-sm px-3 py-3 text-right font-semibold text-light">{fmt(value, 2)}</td>
      {/* gain/loss stacked */}
      <td className="px-3 py-3 text-right">
        {cash ? (
          <span className="text-data-sm text-dim">—</span>
        ) : (
          <div className="flex flex-col items-end leading-tight">
            <span className={cn('text-data-sm', gain >= 0 ? 'text-emerald' : 'text-crimson')}>{fmtSigned(gain, 2)}</span>
            <span className={cn('text-[10px] font-semibold', gain >= 0 ? 'text-emerald/70' : 'text-crimson/70')}>
              {gain >= 0 ? '+' : '−'}
              {Math.abs(gainPct * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </td>
      {/* sparkline */}
      <td className="px-3 py-3">
        <div className="flex justify-end">
          <Sparkline values={h.history} width={64} height={24} />
        </div>
      </td>
      {/* hover actions */}
      <td className="py-3 pl-3 pr-5">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(h)
            }}
            className="rounded-lg p-1.5 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
            aria-label={`Edit ${h.ticker}`}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(h)
            }}
            className="rounded-lg p-1.5 text-dim transition-colors hover:bg-crimson/10 hover:text-crimson"
            aria-label={`Delete ${h.ticker}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </motion.tr>
  )
}
