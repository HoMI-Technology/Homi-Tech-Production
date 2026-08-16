import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Check, ChevronDown, Clock3, SlidersHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useBudget } from '@/store/budget'
import type { TxType } from '@/store/budget'
import { categoryIcon } from '@/components/CategoryIcon'
import { cn } from '@/lib/utils'

export type TypeFilter = 'all' | TxType
export type SortKey = 'newest' | 'oldest' | 'amount-desc' | 'amount-asc'

export const SORT_OPTIONS: { key: SortKey; label: string; icon: LucideIcon }[] = [
  { key: 'newest', label: 'Newest first', icon: Clock3 },
  { key: 'oldest', label: 'Oldest first', icon: Clock3 },
  { key: 'amount-desc', label: 'Amount high → low', icon: ArrowDownWideNarrow },
  { key: 'amount-asc', label: 'Amount low → high', icon: ArrowUpNarrowWide },
]

const TYPE_OPTIONS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expenses' },
]

/** Sticky filter bar (transactions.md §3): type segmented control, category chips, sort menu. */
export default function FilterBar({
  top,
  typeFilter,
  onTypeChange,
  activeCategories,
  onToggleCategory,
  onClearCategories,
  sort,
  onSortChange,
  onHeight,
}: {
  top: number
  typeFilter: TypeFilter
  onTypeChange: (t: TypeFilter) => void
  activeCategories: ReadonlySet<string>
  onToggleCategory: (id: string) => void
  onClearCategories: () => void
  sort: SortKey
  onSortChange: (s: SortKey) => void
  onHeight?: (h: number) => void
}) {
  const { state } = useBudget()
  const [sortOpen, setSortOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  // report bar height so day-group headers can stick below it
  useEffect(() => {
    const el = rootRef.current
    if (!el || !onHeight) return
    const ro = new ResizeObserver(() => onHeight(el.getBoundingClientRect().height))
    ro.observe(el)
    onHeight(el.getBoundingClientRect().height)
    return () => ro.disconnect()
  }, [onHeight])

  // close sort dropdown on outside click / Esc
  useEffect(() => {
    if (!sortOpen) return
    const onDown = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSortOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [sortOpen])

  const activeSort = SORT_OPTIONS.find((o) => o.key === sort) ?? SORT_OPTIONS[0]

  return (
    <div
      ref={rootRef}
      style={{ top }}
      className="sticky z-20 -mx-6 border-b border-white/[0.06] bg-navy/80 px-6 py-3 backdrop-blur lg:-mx-10 lg:px-10"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        {/* type segmented control */}
        <div className="flex items-center rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onTypeChange(opt.key)}
              className={cn(
                'relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                typeFilter === opt.key ? 'text-cyan-300' : 'text-dim hover:text-light',
              )}
            >
              {typeFilter === opt.key && (
                <motion.span
                  layoutId="tx-filter-thumb"
                  className="absolute inset-0 rounded-lg bg-cyan-400/10 shadow-[0_0_14px_rgba(34,211,238,0.1)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* category multi-select chips */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {state.categories.map((c) => {
            const active = activeCategories.has(c.id)
            const Icon = categoryIcon(c.icon)
            return (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.95 }}
                animate={{ scale: active ? [0.95, 1] : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                onClick={() => onToggleCategory(c.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150',
                  active ? 'text-light' : 'border-white/[0.08] text-dim hover:text-light',
                )}
                style={
                  active
                    ? { borderColor: `${c.color}66`, backgroundColor: `${c.color}1a`, color: c.color }
                    : undefined
                }
              >
                <Icon size={12} style={{ color: c.color }} />
                {c.name}
              </motion.button>
            )
          })}
          {activeCategories.size > 0 && (
            <button
              onClick={onClearCategories}
              className="shrink-0 px-2 text-xs font-medium text-cyan transition-colors hover:text-cyan-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* sort menu */}
        <div ref={sortRef} className="relative ml-auto shrink-0">
          <button
            onClick={() => setSortOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-medium text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
            aria-label="Sort transactions"
          >
            <SlidersHorizontal size={14} className="lg:hidden" />
            <span className="hidden lg:inline">{activeSort.label}</span>
            <ChevronDown size={13} className={cn('transition-transform duration-150', sortOpen && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {sortOpen && (
              <motion.div
                key="sort-menu"
                initial={{ scale: 0.96, y: -4, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.97, y: -4, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute right-0 top-full z-30 mt-1.5 w-48 origin-top-right rounded-xl border border-white/[0.1] bg-navyLight p-1.5 shadow-2xl"
              >
                {SORT_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  const selected = sort === opt.key
                  return (
                    <button
                      key={opt.key}
                      onClick={() => {
                        onSortChange(opt.key)
                        setSortOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                        selected ? 'bg-cyan-400/10 text-cyan-300' : 'text-dim hover:bg-white/[0.04] hover:text-light',
                      )}
                    >
                      <Icon size={13} />
                      <span className="flex-1 text-left">{opt.label}</span>
                      {selected && <Check size={13} />}
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
