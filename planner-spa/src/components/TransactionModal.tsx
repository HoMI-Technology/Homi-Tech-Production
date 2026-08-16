import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useBudget } from '@/store/budget'
import type { Transaction, TxType } from '@/store/budget'
import { categoryIcon } from '@/components/CategoryIcon'
import ConfirmDialog from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'

/* ---------------- provider: global open/close API ---------------- */

type ModalApi = {
  openAddModal: (type?: TxType) => void
  openEditModal: (tx: Transaction) => void
}

const ModalContext = createContext<ModalApi | null>(null)

export function useTransactionModal(): ModalApi {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useTransactionModal must be used within <TransactionModalProvider>')
  return ctx
}

export function TransactionModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [defaultType, setDefaultType] = useState<TxType>('expense')

  const openAddModal = useCallback((type: TxType = 'expense') => {
    setEditing(null)
    setDefaultType(type)
    setOpen(true)
  }, [])
  const openEditModal = useCallback((tx: Transaction) => {
    setEditing(tx)
    setOpen(true)
  }, [])
  const close = useCallback(() => setOpen(false), [])

  const api = useMemo(() => ({ openAddModal, openEditModal }), [openAddModal, openEditModal])
  return (
    <ModalContext.Provider value={api}>
      {children}
      <TransactionModal open={open} editing={editing} defaultType={defaultType} onClose={close} />
    </ModalContext.Provider>
  )
}

/* ---------------- the modal itself (design.md §6.4) ---------------- */

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function TransactionModal({
  open,
  editing,
  defaultType,
  onClose,
}: {
  open: boolean
  editing: Transaction | null
  defaultType: TxType
  onClose: () => void
}) {
  const { state, addTransaction, updateTransaction, deleteTransaction } = useBudget()
  const [type, setType] = useState<TxType>(defaultType)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<{ amount?: string; description?: string }>({})
  const [shakeKey, setShakeKey] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setType(editing.type)
      setAmount(String(editing.amount))
      setDescription(editing.description)
      setCategoryId(editing.categoryId)
      setDate(editing.date)
      setNotes(editing.notes ?? '')
    } else {
      setType(defaultType)
      setAmount('')
      setDescription('')
      setCategoryId('')
      setDate(todayIso())
      setNotes('')
    }
    setErrors({})
    setConfirmDelete(false)
    const t = setTimeout(() => amountRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [open, editing, defaultType])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const categories = state.categories.filter((c) => (type === 'income' ? c.id === 'income' : c.id !== 'income'))
  const effectiveCategory = categories.some((c) => c.id === categoryId) ? categoryId : categories[0]?.id

  const save = () => {
    const value = parseFloat(amount)
    const nextErrors: { amount?: string; description?: string } = {}
    if (!Number.isFinite(value) || value <= 0) nextErrors.amount = 'Enter an amount greater than $0'
    if (!description.trim()) nextErrors.description = 'Add a description'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setShakeKey((k) => k + 1)
      return
    }
    const payload = {
      type,
      amount: Math.round(value * 100) / 100,
      description: description.trim(),
      categoryId: effectiveCategory ?? 'income',
      date,
      notes: notes.trim() || undefined,
    }
    if (editing) updateTransaction(editing.id, payload)
    else addTransaction(payload)
    onClose()
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="tx-underlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-navyLight/80 p-4 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              key="tx-panel"
              initial={{ y: 24, scale: 0.97, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 12, scale: 0.98, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="max-h-[92dvh] w-full max-w-[560px] overflow-y-auto rounded-2xl border border-white/[0.1] bg-navyLight p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-h3">{editing ? 'Edit transaction' : 'Add transaction'}</h3>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* type segmented control */}
              <div className="mt-4 grid grid-cols-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
                {(['expense', 'income'] as TxType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={cn(
                      'relative rounded-lg py-2 text-sm font-semibold capitalize transition-colors',
                      type === t ? (t === 'expense' ? 'text-crimson' : 'text-cyan') : 'text-dim hover:text-light',
                    )}
                  >
                    {type === t && (
                      <motion.span
                        layoutId="tx-type-thumb"
                        className={cn(
                          'absolute inset-0 rounded-lg border',
                          t === 'expense' ? 'border-crimson/30 bg-crimson/10' : 'border-cyan/30 bg-cyan/10',
                        )}
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative">{t}</span>
                  </button>
                ))}
              </div>

              <motion.div
                key={shakeKey}
                animate={shakeKey > 0 ? { x: [0, -6, 6, -6, 6, 0] } : undefined}
                transition={{ duration: 0.3 }}
              >
                {/* amount */}
                <label className="text-label mt-5 block">Amount</label>
                <div
                  className={cn(
                    'mt-1.5 flex items-center rounded-xl border bg-white/[0.03] px-4 focus-within:ring-2 focus-within:ring-cyan-400/50',
                    errors.amount ? 'border-crimson/60' : 'border-white/[0.1]',
                  )}
                >
                  <span className="font-display text-xl text-dim">$</span>
                  <input
                    ref={amountRef}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-full bg-transparent py-3 pl-2 font-display text-2xl font-semibold text-light tnum placeholder:text-dim/50 focus:outline-none"
                  />
                </div>
                {errors.amount && <p className="mt-1 text-xs text-crimson">{errors.amount}</p>}

                {/* description */}
                <label className="text-label mt-4 block">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={type === 'income' ? 'e.g. Salary — Acme Corp' : 'e.g. Whole Foods Market'}
                  className={cn(
                    'mt-1.5 w-full rounded-xl border bg-white/[0.03] px-3.5 py-2.5 text-sm text-light placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50',
                    errors.description ? 'border-crimson/60' : 'border-white/[0.1]',
                  )}
                />
                {errors.description && <p className="mt-1 text-xs text-crimson">{errors.description}</p>}
              </motion.div>

              {/* category icon grid */}
              <label className="text-label mt-4 block">Category</label>
              <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                {categories.map((c) => {
                  const Icon = categoryIcon(c.icon)
                  const active = effectiveCategory === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCategoryId(c.id)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-colors',
                        active ? 'border-white/[0.14] bg-white/[0.06]' : 'border-transparent hover:bg-white/[0.04]',
                      )}
                      style={active ? { borderColor: `${c.color}55`, backgroundColor: `${c.color}14` } : undefined}
                    >
                      <Icon size={16} style={{ color: c.color }} />
                      <span className={cn('text-[10px] leading-tight', active ? 'text-light' : 'text-dim')}>{c.name}</span>
                    </button>
                  )
                })}
              </div>

              {/* date + notes */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-label block">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-sm text-light focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  />
                </div>
                <div>
                  <label className="text-label block">Notes <span className="normal-case text-dim/60">(optional)</span></label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add a note"
                    className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-sm text-light placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  />
                </div>
              </div>

              {/* footer */}
              <div className="mt-6 flex items-center gap-2">
                {editing && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-crimson transition-colors hover:bg-crimson/10"
                  >
                    Delete
                  </button>
                )}
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={onClose}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={save}
                    className="rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-glow-cyan"
                  >
                    Save transaction
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this transaction?"
        body={editing ? `"${editing.description}" will be removed from your ledger. You can undo for a few seconds after deleting.` : ''}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (editing) deleteTransaction(editing.id)
          onClose()
        }}
      />
    </>
  )
}
