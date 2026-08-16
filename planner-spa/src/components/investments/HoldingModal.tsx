import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useBudget } from '@/store/budget'
import type { Holding } from '@/store/budget'
import ConfirmDialog from '@/components/ConfirmDialog'
import { genHistory, hashStr, round2, tickerVol } from './investUtils'
import { cn } from '@/lib/utils'

/** Add / edit holding modal — investments.md §6. Same chrome as TransactionModal. */
export default function HoldingModal({
  open,
  editing,
  onClose,
  onDelete,
  onSaved,
}: {
  open: boolean
  editing: Holding | null
  onClose: () => void
  onDelete: (h: Holding) => void
  /** Lets the page seed its live-price overlay for the saved holding. */
  onSaved: (h: Holding) => void
}) {
  const { addHolding, updateHolding } = useBudget()
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')
  const [shares, setShares] = useState('')
  const [avgCost, setAvgCost] = useState('')
  const [price, setPrice] = useState('')
  const [priceTouched, setPriceTouched] = useState(false)
  const [errors, setErrors] = useState<{ ticker?: string; shares?: string; avgCost?: string }>({})
  const [shakeKey, setShakeKey] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const tickerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setTicker(editing.ticker)
      setName(editing.name)
      setShares(String(editing.shares))
      setAvgCost(String(editing.avgCost))
      setPrice(String(editing.price))
      setPriceTouched(true)
    } else {
      setTicker('')
      setName('')
      setShares('')
      setAvgCost('')
      setPrice('')
      setPriceTouched(false)
    }
    setErrors({})
    setConfirmDelete(false)
    const t = setTimeout(() => tickerRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [open, editing])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const save = () => {
    const sh = parseFloat(shares)
    const ac = parseFloat(avgCost)
    const pr = priceTouched && price.trim() !== '' ? parseFloat(price) : ac
    const nextErrors: { ticker?: string; shares?: string; avgCost?: string } = {}
    if (!ticker.trim()) nextErrors.ticker = 'Enter a ticker'
    if (!Number.isFinite(sh) || sh <= 0) nextErrors.shares = 'Shares must be greater than 0'
    if (!Number.isFinite(ac) || ac <= 0) nextErrors.avgCost = 'Avg cost must be greater than $0'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setShakeKey((k) => k + 1)
      return
    }

    const t = ticker.trim().toUpperCase().slice(0, 6)
    const finalPrice = round2(Number.isFinite(pr) && pr > 0 ? pr : ac)
    if (editing) {
      const priceChanged = Math.abs(finalPrice - editing.price) > 0.001
      const history = priceChanged ? [...editing.history.slice(0, 29), finalPrice] : editing.history
      const patch = {
        ticker: t,
        name: name.trim() || t,
        shares: sh,
        avgCost: round2(ac),
        price: finalPrice,
        prevClose: priceChanged ? editing.price : editing.prevClose,
        history,
      }
      updateHolding(editing.id, patch)
      onSaved({ ...editing, ...patch })
    } else {
      const history = genHistory(finalPrice, tickerVol(t), hashStr(t) % 1000)
      const created = addHolding({
        ticker: t,
        name: name.trim() || t,
        shares: sh,
        avgCost: round2(ac),
        price: finalPrice,
        prevClose: history[28],
        history,
      })
      onSaved(created)
    }
    onClose()
  }

  const inputCls = (hasError?: string) =>
    cn(
      'mt-1.5 w-full rounded-xl border bg-white/[0.03] px-3.5 py-2.5 text-sm text-light placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50',
      hasError ? 'border-crimson/60' : 'border-white/[0.1]',
    )

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="holding-underlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-navyLight/80 p-4 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              key="holding-panel"
              initial={{ y: 24, scale: 0.97, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 12, scale: 0.98, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-2xl border border-white/[0.1] bg-navyLight p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-h3">{editing ? 'Edit holding' : 'Add holding'}</h3>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <motion.div
                key={shakeKey}
                animate={shakeKey > 0 ? { x: [0, -6, 6, -6, 6, 0] } : undefined}
                transition={{ duration: 0.3 }}
              >
                <div className="mt-5 grid grid-cols-5 gap-3">
                  <div className="col-span-2">
                    <label className="text-label block">Ticker</label>
                    <input
                      ref={tickerRef}
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z.]/g, '').slice(0, 6))}
                      placeholder="VTI"
                      className={cn(inputCls(errors.ticker), 'font-display font-semibold uppercase tracking-wide')}
                    />
                    {errors.ticker && <p className="mt-1 text-xs text-crimson">{errors.ticker}</p>}
                  </div>
                  <div className="col-span-3">
                    <label className="text-label block">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Vanguard Total Stock Market ETF"
                      className={inputCls()}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-label block">Shares</label>
                    <input
                      value={shares}
                      onChange={(e) => setShares(e.target.value.replace(/[^0-9.]/g, ''))}
                      inputMode="decimal"
                      placeholder="0"
                      className={cn(inputCls(errors.shares), 'tnum')}
                    />
                    {errors.shares && <p className="mt-1 text-xs text-crimson">{errors.shares}</p>}
                  </div>
                  <div>
                    <label className="text-label block">Avg cost</label>
                    <div
                      className={cn(
                        'mt-1.5 flex items-center rounded-xl border bg-white/[0.03] px-3 focus-within:ring-2 focus-within:ring-cyan-400/50',
                        errors.avgCost ? 'border-crimson/60' : 'border-white/[0.1]',
                      )}
                    >
                      <span className="text-sm text-dim">$</span>
                      <input
                        value={avgCost}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9.]/g, '')
                          setAvgCost(v)
                          if (!priceTouched) setPrice(v)
                        }}
                        inputMode="decimal"
                        placeholder="0.00"
                        className="w-full bg-transparent py-2.5 pl-1.5 text-sm text-light tnum placeholder:text-dim/50 focus:outline-none"
                      />
                    </div>
                    {errors.avgCost && <p className="mt-1 text-xs text-crimson">{errors.avgCost}</p>}
                  </div>
                  <div>
                    <label className="text-label block">Current price</label>
                    <div className="mt-1.5 flex items-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 focus-within:ring-2 focus-within:ring-cyan-400/50">
                      <span className="text-sm text-dim">$</span>
                      <input
                        value={price}
                        onChange={(e) => {
                          setPrice(e.target.value.replace(/[^0-9.]/g, ''))
                          setPriceTouched(true)
                        }}
                        inputMode="decimal"
                        placeholder="0.00"
                        className="w-full bg-transparent py-2.5 pl-1.5 text-sm text-light tnum placeholder:text-dim/50 focus:outline-none"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-dim/70">simulated from here</p>
                  </div>
                </div>
              </motion.div>

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
                    Save holding
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${editing?.ticker ?? 'this holding'}?`}
        body={
          editing
            ? `${editing.name} (${editing.shares} shares) will be removed from your portfolio. You can undo for a few seconds after deleting.`
            : ''
        }
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (editing) onDelete(editing)
          onClose()
        }}
      />
    </>
  )
}
