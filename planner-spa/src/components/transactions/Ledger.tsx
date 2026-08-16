import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown01, Pencil, Trash2 } from 'lucide-react'
import { categoryById, fmt, fmtSigned, useBudget } from '@/store/budget'
import type { Transaction } from '@/store/budget'
import type { SortKey } from '@/components/transactions/FilterBar'
import { categoryIcon } from '@/components/CategoryIcon'
import { cn } from '@/lib/utils'

export type DayGroup = { date: string; txs: Transaction[]; net: number }

/** Group + sort the filtered ledger by day (transactions.md §4). */
export function buildDayGroups(txs: Transaction[], sort: SortKey): DayGroup[] {
  const byDay = new Map<string, Transaction[]>()
  for (const t of txs) {
    const list = byDay.get(t.date)
    if (list) list.push(t)
    else byDay.set(t.date, [t])
  }
  const within = (a: Transaction, b: Transaction): number => {
    switch (sort) {
      case 'amount-desc':
        return b.amount - a.amount
      case 'amount-asc':
        return a.amount - b.amount
      case 'oldest':
        return a.id.localeCompare(b.id)
      default:
        return b.id.localeCompare(a.id)
    }
  }
  const groups: DayGroup[] = [...byDay.entries()].map(([date, list]) => {
    const sorted = [...list].sort(within)
    const net = sorted.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)
    return { date, txs: sorted, net }
  })
  groups.sort((a, b) => (sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)))
  return groups
}

function dayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const rest = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${weekday} · ${rest}`.toUpperCase()
}

function Row({
  tx,
  delay,
  selected,
  selectionActive,
  onToggleSelect,
  onEdit,
  onDelete,
  flashed,
  flashTick,
}: {
  tx: Transaction
  delay: number
  selected: boolean
  selectionActive: boolean
  onToggleSelect: (id: string) => void
  onEdit: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
  flashed: boolean
  flashTick: number
}) {
  const { state } = useBudget()
  const category = categoryById(state, tx.categoryId)
  const Icon = categoryIcon(category?.icon ?? 'Tag')
  const color = category?.color ?? '#94a3b8'
  const income = tx.type === 'income'

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ height: 0, opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }}
      transition={{ duration: 0.25, ease: 'easeOut', delay }}
      className="group relative list-none overflow-hidden"
    >
      {/* undo / edit cyan flash */}
      {flashed && (
        <motion.span
          key={flashTick}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 z-10 bg-cyan/[0.08]"
        />
      )}
      {/* category-color left edge on hover */}
      <span
        className="absolute inset-y-2 left-0 w-[2px] rounded-full opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{ backgroundColor: color }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => onEdit(tx)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEdit(tx)
        }}
        className="flex cursor-pointer items-center gap-3 border-b border-white/[0.04] px-4 py-3.5 transition-colors duration-150 group-hover:rounded-xl group-hover:bg-white/[0.03]"
      >
        {/* bulk-select checkbox: appears on row hover / when selection mode is active */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect(tx.id)
          }}
          aria-label={selected ? 'Deselect transaction' : 'Select transaction'}
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-150',
            selected
              ? 'border-cyan bg-cyan text-navy opacity-100'
              : 'border-white/[0.2] text-transparent hover:border-cyan/60 lg:opacity-0 lg:group-hover:opacity-100',
            selectionActive && 'opacity-100',
          )}
        >
          <svg viewBox="0 0 10 8" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 4l2.5 2.5L9 1" />
          </svg>
        </button>

        {/* category icon chip */}
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <Icon size={15} />
        </span>

        {/* description + notes */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-light">{tx.description}</p>
          {tx.notes && <p className="mt-0.5 truncate text-xs text-dim max-sm:hidden">{tx.notes}</p>}
        </div>

        {/* category pill */}
        {category && (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium max-sm:hidden"
            style={{ color, backgroundColor: `${color}1a` }}
          >
            {category.name}
          </span>
        )}

        {/* amount */}
        <span
          className={cn(
            'ml-auto shrink-0 text-right font-display text-[15px] font-medium tnum',
            income ? 'text-cyan' : 'text-crimson',
          )}
        >
          {income ? `+${fmt(tx.amount, 2)}` : `−${fmt(tx.amount, 2)}`}
        </span>

        {/* hover actions */}
        <div className="flex shrink-0 items-center gap-0.5 transition-all [transition-duration:120ms] lg:translate-x-1 lg:opacity-0 lg:group-hover:translate-x-0 lg:group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(tx)
            }}
            aria-label="Edit transaction"
            className="rounded-lg p-1.5 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(tx)
            }}
            aria-label="Delete transaction"
            className="rounded-lg p-1.5 text-dim transition-colors hover:bg-crimson/10 hover:text-crimson"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.li>
  )
}

/** Day-grouped ledger with sticky group headers + "Load earlier" pagination (transactions.md §4, §8). */
export default function Ledger({
  groups,
  headerTop,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  flashIds,
  flashTick,
  visibleGroups,
  onLoadMore,
}: {
  groups: DayGroup[]
  headerTop: number
  selected: ReadonlySet<string>
  onToggleSelect: (id: string) => void
  onEdit: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
  flashIds: ReadonlySet<string>
  flashTick: number
  visibleGroups: number
  onLoadMore: () => void
}) {
  const visible = useMemo(() => groups.slice(0, visibleGroups), [groups, visibleGroups])
  const hasMore = groups.length > visible.length

  return (
    <div>
      {visible.map((group, gi) => (
        <motion.section
          key={group.date}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay: Math.min(gi * 0.04, 0.4) }}
          className="relative"
        >
          {/* sticky group header */}
          <div
            style={{ top: headerTop }}
            className="sticky z-10 -mx-2 flex items-baseline justify-between border-b border-white/[0.06] bg-navy/90 px-2 pb-1.5 pt-4 backdrop-blur"
          >
            <p className="text-label">{dayLabel(group.date)}</p>
            <p className={cn('text-data-sm', group.net >= 0 ? 'text-cyan' : 'text-crimson')}>
              {fmtSigned(group.net, 2)}
            </p>
          </div>
          <ul>
            <AnimatePresence initial={false}>
              {group.txs.map((tx, ri) => (
                <Row
                  key={tx.id}
                    tx={tx}
                    delay={Math.min(gi * 0.04, 0.4) + ri * 0.03}
                    selected={selected.has(tx.id)}
                    selectionActive={selected.size > 0}
                    onToggleSelect={onToggleSelect}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    flashed={flashIds.has(tx.id)}
                    flashTick={flashTick}
                  />
              ))}
            </AnimatePresence>
          </ul>
        </motion.section>
      ))}

      {hasMore && (
        <div className="flex justify-center pt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onLoadMore}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-4 py-2 text-sm font-medium text-dim transition-colors hover:bg-white/[0.04] hover:text-light"
          >
            <ArrowDown01 size={14} />
            Load earlier
          </motion.button>
        </div>
      )}
    </div>
  )
}
