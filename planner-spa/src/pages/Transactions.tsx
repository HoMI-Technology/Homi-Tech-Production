import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { SearchX } from 'lucide-react'
import {
  categoryById,
  fmt,
  monthLabel,
  transactionsInMonth,
  useBudget,
} from '@/store/budget'
import type { Transaction } from '@/store/budget'
import { useTopBarExtras } from '@/components/TopBar'
import { useTransactionModal } from '@/components/TransactionModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import SearchInput from '@/components/transactions/SearchInput'
import SummaryStrip from '@/components/transactions/SummaryStrip'
import FilterBar from '@/components/transactions/FilterBar'
import type { SortKey, TypeFilter } from '@/components/transactions/FilterBar'
import Ledger, { buildDayGroups } from '@/components/transactions/Ledger'
import BulkBar from '@/components/transactions/BulkBar'

const PAGE_SIZE = 10

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

/** Measured height of the shared sticky TopBar so the filter bar / group headers can stick below it. */
function useTopBarHeight(): number {
  const [h, setH] = useState(84)
  useEffect(() => {
    const el = document.querySelector('header')
    if (!el) return
    const ro = new ResizeObserver(() => setH(el.getBoundingClientRect().height))
    ro.observe(el)
    setH(el.getBoundingClientRect().height)
    return () => ro.disconnect()
  }, [])
  return h
}

/** The full ledger (transactions.md): summary chips, filters, day groups, add/edit/delete with undo. */
export default function Transactions() {
  const { state, monthOffset, deleteTransaction, updateTransaction } = useBudget()
  const { openAddModal, openEditModal } = useTransactionModal()
  const [searchParams, setSearchParams] = useSearchParams()

  /* ---------------- filters (deep-link synced: ?type= ?category=) ---------------- */

  const [typeFilter, setTypeFilterState] = useState<TypeFilter>(() => {
    const t = searchParams.get('type')
    return t === 'income' || t === 'expense' ? t : 'all'
  })
  const [activeCats, setActiveCats] = useState<Set<string>>(() => {
    const c = searchParams.get('category')
    return new Set((c ?? '').split(',').filter(Boolean))
  })
  const [sort, setSort] = useState<SortKey>('newest')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // typing debounce 150ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150)
    return () => clearTimeout(t)
  }, [query])

  // react to deep-link param changes (e.g. Overview donut → ?category=groceries)
  useEffect(() => {
    const t = searchParams.get('type')
    const nextType: TypeFilter = t === 'income' || t === 'expense' ? t : 'all'
    setTypeFilterState((prev) => (prev === nextType ? prev : nextType))
    const nextCats = new Set((searchParams.get('category') ?? '').split(',').filter(Boolean))
    setActiveCats((prev) => (sameSet(prev, nextCats) ? prev : nextCats))
  }, [searchParams])

  const applyParams = useCallback(
    (t: TypeFilter, cats: ReadonlySet<string>) => {
      const next = new URLSearchParams(searchParams)
      if (t === 'all') next.delete('type')
      else next.set('type', t)
      if (cats.size === 0) next.delete('category')
      else next.set('category', [...cats].join(','))
      if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const setTypeFilter = (t: TypeFilter) => {
    setTypeFilterState(t)
    applyParams(t, activeCats)
  }
  const toggleCategory = (id: string) => {
    const next = new Set(activeCats)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setActiveCats(next)
    applyParams(typeFilter, next)
  }
  const clearCategories = () => {
    const next = new Set<string>()
    setActiveCats(next)
    applyParams(typeFilter, next)
  }
  const clearAllFilters = () => {
    setQuery('')
    setDebouncedQuery('')
    setTypeFilter('all')
    clearCategories()
  }

  /* ---------------- derived data ---------------- */

  const monthTxs = useMemo(() => transactionsInMonth(state, monthOffset), [state, monthOffset])

  const filtered = useMemo(() => {
    let list = monthTxs
    if (typeFilter !== 'all') list = list.filter((t) => t.type === typeFilter)
    if (activeCats.size > 0) list = list.filter((t) => activeCats.has(t.categoryId))
    const q = debouncedQuery.trim().toLowerCase()
    if (q) {
      const qNum = q.replace(/[$,]/g, '')
      list = list.filter((t) => {
        const cat = categoryById(state, t.categoryId)?.name.toLowerCase() ?? ''
        return (
          t.description.toLowerCase().includes(q) ||
          (t.notes ?? '').toLowerCase().includes(q) ||
          cat.includes(q) ||
          (qNum !== '' &&
            (fmt(t.amount, 2).replace(/[$,]/g, '').includes(qNum) || String(t.amount).includes(qNum)))
        )
      })
    }
    return list
  }, [monthTxs, typeFilter, activeCats, debouncedQuery, state])

  const summary = useMemo(() => {
    const income = filtered.filter((t) => t.type === 'income')
    const expenses = filtered.filter((t) => t.type === 'expense')
    const incomeSum = income.reduce((s, t) => s + t.amount, 0)
    const expenseSum = expenses.reduce((s, t) => s + t.amount, 0)
    return {
      income: incomeSum,
      incomeCount: income.length,
      expenses: expenseSum,
      expenseCount: expenses.length,
      net: incomeSum - expenseSum,
    }
  }, [filtered])

  const groups = useMemo(() => buildDayGroups(filtered, sort), [filtered, sort])

  const filterKey = `${monthOffset}|${typeFilter}|${[...activeCats].sort().join(',')}|${debouncedQuery.trim()}|${sort}`

  /* ---------------- pagination ---------------- */

  const [visibleGroups, setVisibleGroups] = useState(PAGE_SIZE)
  useEffect(() => setVisibleGroups(PAGE_SIZE), [filterKey])

  /* ---------------- bulk selection ---------------- */

  const [selected, setSelected] = useState<Set<string>>(new Set())
  useEffect(() => setSelected(new Set()), [filterKey])
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const [confirmBulk, setConfirmBulk] = useState(false)
  const bulkCategorize = (categoryId: string) => {
    for (const id of selected) updateTransaction(id, { categoryId })
    setSelected(new Set())
  }
  const bulkDelete = () => {
    for (const id of selected) deleteTransaction(id)
    setSelected(new Set())
  }

  /* ---------------- single delete ---------------- */

  const [confirmTx, setConfirmTx] = useState<Transaction | null>(null)

  /* ---------------- edit/undo cyan flash (diff against previous transactions) ---------------- */

  const prevTxsRef = useRef<Map<string, Transaction> | null>(null)
  const everSeenRef = useRef<Set<string> | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  const [flashTick, setFlashTick] = useState(0)

  useEffect(() => {
    const current = new Map(state.transactions.map((t) => [t.id, t]))
    if (!everSeenRef.current) everSeenRef.current = new Set(current.keys())
    const prev = prevTxsRef.current
    if (prev) {
      const flashes = new Set<string>()
      for (const [id, tx] of current) {
        const p = prev.get(id)
        if (p && p !== tx) flashes.add(id) // edited
        else if (!p && everSeenRef.current.has(id)) flashes.add(id) // restored via undo
      }
      if (flashes.size > 0) {
        setFlashIds(flashes)
        setFlashTick((t) => t + 1)
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
        flashTimerRef.current = setTimeout(() => setFlashIds(new Set()), 700)
      }
    }
    for (const id of current.keys()) everSeenRef.current.add(id)
    prevTxsRef.current = current
  }, [state.transactions])

  /* ---------------- sticky offsets ---------------- */

  const topBarH = useTopBarHeight()
  const [filterH, setFilterH] = useState(0)
  const onFilterHeight = useCallback((h: number) => setFilterH(h), [])

  /* ---------------- keyboard shortcuts: n = new, / = search ---------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      const typing =
        !!target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      if (typing) return
      if (e.key === 'n') {
        e.preventDefault()
        openAddModal(typeFilter === 'all' ? 'expense' : typeFilter)
      } else if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openAddModal, typeFilter])

  /* ---------------- top bar extras (search) ---------------- */

  const matchCount = debouncedQuery.trim() ? filtered.length : null
  const extrasNode = useMemo(
    () => <SearchInput ref={searchRef} value={query} onChange={setQuery} matchCount={matchCount} />,
    [query, matchCount],
  )
  useTopBarExtras(extrasNode)

  /* ---------------- render ---------------- */

  const hasAnyInMonth = monthTxs.length > 0
  const hasResults = filtered.length > 0

  return (
    <div className="pb-28">
      <SummaryStrip summary={summary} />

      <div className="mt-5">
        <FilterBar
          top={topBarH}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          activeCategories={activeCats}
          onToggleCategory={toggleCategory}
          onClearCategories={clearCategories}
          sort={sort}
          onSortChange={setSort}
          onHeight={onFilterHeight}
        />
      </div>

      {!hasAnyInMonth ? (
        /* empty month / no transactions at all (transactions.md §7) */
        <div className="card-chrome mt-6 flex flex-col items-center justify-center px-6 py-16 text-center">
          <motion.img
            src="/empty-ledger.svg"
            alt=""
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 0.85, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-[240px]"
          />
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.08 }}
            className="mt-6 font-serif text-xl italic text-light/90"
          >
            Nothing here yet — your readiness starts with one entry.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.16 }}
            className="mt-1.5 max-w-sm text-sm text-dim"
          >
            No entries in {monthLabel(monthOffset)}. Add income or an expense and the ledger comes alive.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.24 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openAddModal(typeFilter === 'all' ? 'expense' : typeFilter)}
            className="mt-6 rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-glow-cyan"
          >
            Add your first transaction
          </motion.button>
        </div>
      ) : !hasResults ? (
        /* no filter results */
        <div className="card-chrome mt-6 flex flex-col items-center justify-center px-6 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03]"
          >
            <SearchX size={22} className="text-dim" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.08 }}
            className="mt-5 font-serif text-xl italic text-light/90"
          >
            No matches.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.16 }}
            className="mt-1.5 text-sm text-dim"
          >
            Try a different search or clear filters
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.24 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={clearAllFilters}
            className="mt-6 rounded-xl border border-white/[0.08] px-4 py-2 text-sm font-medium text-dim transition-colors hover:bg-white/[0.04] hover:text-light"
          >
            Clear filters
          </motion.button>
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={filterKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } }}
            exit={{ opacity: 0, x: -8, transition: { duration: 0.15, ease: 'easeIn' } }}
            className="mt-2"
          >
            <Ledger
              groups={groups}
              headerTop={topBarH + filterH}
              selected={selected}
              onToggleSelect={toggleSelect}
              onEdit={openEditModal}
              onDelete={setConfirmTx}
              flashIds={flashIds}
              flashTick={flashTick}
              visibleGroups={visibleGroups}
              onLoadMore={() => setVisibleGroups((n) => n + PAGE_SIZE)}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* bulk action bar */}
      <BulkBar
        count={selected.size}
        onDelete={() => setConfirmBulk(true)}
        onCategorize={bulkCategorize}
        onClear={() => setSelected(new Set())}
      />

      {/* single delete confirm (transactions.md §6) */}
      <ConfirmDialog
        open={confirmTx !== null}
        title="Delete this transaction?"
        body={
          confirmTx
            ? `"${confirmTx.description}" — ${confirmTx.type === 'income' ? '+' : '−'}${fmt(confirmTx.amount, 2)} will be removed from your ledger. You can undo for a few seconds after deleting.`
            : ''
        }
        onClose={() => setConfirmTx(null)}
        onConfirm={() => {
          if (confirmTx) deleteTransaction(confirmTx.id)
        }}
      />

      {/* bulk delete confirm */}
      <ConfirmDialog
        open={confirmBulk}
        title={`Delete ${selected.size} ${selected.size === 1 ? 'transaction' : 'transactions'}?`}
        body="The selected entries will be removed from your ledger. You can undo each delete for a few seconds after."
        onClose={() => setConfirmBulk(false)}
        onConfirm={bulkDelete}
      />
    </div>
  )
}
