import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Plus, RefreshCw } from 'lucide-react'
import { fmt, fmtPct, fmtSigned, fmtTime, useBudget } from '@/store/budget'
import type { Holding } from '@/store/budget'
import AnimatedNumber from '@/components/AnimatedNumber'
import PulseDot from '@/components/PulseDot'
import EmptyState from '@/components/EmptyState'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useTopBarExtras } from '@/components/TopBar'
import PerformanceChart from '@/components/investments/PerformanceChart'
import AllocationCard from '@/components/investments/AllocationCard'
import HoldingsTable from '@/components/investments/HoldingsTable'
import MoversStrip from '@/components/investments/MoversStrip'
import HoldingModal from '@/components/investments/HoldingModal'
import HoldingDrawer from '@/components/investments/HoldingDrawer'
import { isCashHolding, mulberry32, portfolioSeries, round2, tickerVol } from '@/components/investments/investUtils'
import { cn } from '@/lib/utils'

type PriceOverlay = { price: number; prevClose: number; history: number[] }

/** Investments view — /investments (investments.md). Simulated portfolio monitor. */
export default function Investments() {
  const { state, deleteHolding } = useBudget()

  /* ---- live simulated prices (page-local overlay; the store stays canonical) ---- */
  const [live, setLive] = useState<Record<string, PriceOverlay>>({})
  const [tick, setTick] = useState(0)
  const [flash, setFlash] = useState<Record<string, 'up' | 'down'>>({})
  const [spinning, setSpinning] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(state.savedAt)

  const holdings: Holding[] = useMemo(
    () => state.holdings.map((h) => (live[h.id] ? { ...h, ...live[h.id] } : h)),
    [state.holdings, live],
  )

  const refresh = useCallback(() => {
    const r = mulberry32(9100 + tick * 37)
    const nextFlash: Record<string, 'up' | 'down'> = {}
    setLive((prev) => {
      const next: Record<string, PriceOverlay> = {}
      for (const h of state.holdings) {
        const cur = prev[h.id] ?? { price: h.price, prevClose: h.prevClose, history: h.history }
        if (isCashHolding(h) || tickerVol(h.ticker) === 0) {
          next[h.id] = cur
          continue
        }
        const step = (r() - 0.485) * tickerVol(h.ticker)
        const price = round2(Math.max(0.01, cur.price * (1 + step)))
        next[h.id] = { price, prevClose: cur.price, history: [...cur.history.slice(1), price] }
        nextFlash[h.id] = price >= cur.price ? 'up' : 'down'
      }
      return next
    })
    setTick((t) => t + 1)
    setFlash(nextFlash)
    setUpdatedAt(new Date().toISOString())
    setSpinning(true)
    window.setTimeout(() => setFlash({}), 500)
    window.setTimeout(() => setSpinning(false), 600)
  }, [state.holdings, tick])

  /* auto-tick every 30s */
  useEffect(() => {
    const t = window.setInterval(refresh, 30000)
    return () => window.clearInterval(t)
  }, [refresh])

  /* ---- UI state ---- */
  const [modal, setModal] = useState<{ open: boolean; editing: Holding | null }>({ open: false, editing: null })
  const [confirmDel, setConfirmDel] = useState<Holding | null>(null)
  const [drawerId, setDrawerId] = useState<string | null>(null)

  const openAdd = useCallback(() => setModal({ open: true, editing: null }), [])
  const openEdit = useCallback((h: Holding) => setModal({ open: true, editing: h }), [])
  const askDelete = useCallback((h: Holding) => setConfirmDel(h), [])
  const onSaved = useCallback((h: Holding) => {
    setLive((prev) => ({ ...prev, [h.id]: { price: h.price, prevClose: h.prevClose, history: h.history } }))
  }, [])

  /* ---- derived portfolio numbers ---- */
  const derived = useMemo(() => {
    let value = 0
    let prevValue = 0
    let cost = 0
    let investedValue = 0
    for (const h of holdings) {
      value += h.shares * h.price
      prevValue += h.shares * h.prevClose
      if (!isCashHolding(h)) {
        cost += h.shares * h.avgCost
        investedValue += h.shares * h.price
      }
    }
    const dayChange = value - prevValue
    const dayPct = prevValue > 0 ? dayChange / prevValue : 0
    const gain = investedValue - cost
    const gainPct = cost > 0 ? gain / cost : 0
    // synthesized intraday range, deterministic per tick
    const r = mulberry32(4700 + tick * 91)
    let lo = 0
    let hi = 0
    for (const h of holdings) {
      const v = tickerVol(h.ticker)
      lo += h.shares * Math.min(h.price, h.prevClose) * (1 - (0.3 + 0.7 * r()) * v)
      hi += h.shares * Math.max(h.price, h.prevClose) * (1 + (0.3 + 0.7 * r()) * v)
    }
    return { value, cost, dayChange, dayPct, gain, gainPct, lo: round2(lo), hi: round2(hi) }
  }, [holdings, tick])

  const computeSeries = useCallback((days: number) => portfolioSeries(holdings, days), [holdings])

  /* ---- top bar extras: refresh + add holding ---- */
  const extras = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
        >
          <motion.span animate={spinning ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 0.6, ease: 'easeInOut' }} className="flex">
            <RefreshCw size={13} />
          </motion.span>
          <span className="max-sm:hidden">Refresh prices</span>
        </button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-xl bg-cyan px-3.5 py-2 text-xs font-semibold text-navy shadow-glow-cyan"
        >
          <Plus size={14} /> Add holding
        </motion.button>
      </div>
    ),
    [refresh, spinning, openAdd],
  )
  useTopBarExtras(extras)

  /* ---- empty state ---- */
  if (state.holdings.length === 0) {
    return (
      <div className="grid grid-cols-12 gap-4">
        <div className="card-chrome col-span-12">
          <EmptyState
            line="No positions yet — plant the first seed."
            caption="Add a holding and HōMI will simulate 30 days of price history so charts and sparklines work instantly."
            actionLabel="Add your first holding"
            onAction={openAdd}
          />
        </div>
        <HoldingModal
          open={modal.open}
          editing={modal.editing}
          onClose={() => setModal((m) => ({ ...m, open: false }))}
          onDelete={askDelete}
          onSaved={onSaved}
        />
        <ConfirmDialog
          open={confirmDel !== null}
          title={`Delete ${confirmDel?.ticker ?? 'this holding'}?`}
          body={confirmDel ? `${confirmDel.name} will be removed from your portfolio. You can undo for a few seconds after deleting.` : ''}
          onClose={() => setConfirmDel(null)}
          onConfirm={() => {
            if (confirmDel) deleteHolding(confirmDel.id)
          }}
        />
      </div>
    )
  }

  const dayUp = derived.dayChange >= 0
  const gainUp = derived.gain >= 0

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* ============================== HERO ============================== */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="card-chrome card-hairline-top relative col-span-12 overflow-hidden p-6 lg:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.10), transparent 70%)' }}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row">
          {/* left zone 40% */}
          <div className="lg:w-[40%]">
            <div className="flex items-center gap-2.5">
              <PulseDot color="#22d3ee" size={7} />
              <span className="text-label">Total portfolio value</span>
              <span className="text-[10px] text-dim/70">Simulated prices · demo data</span>
            </div>
            <AnimatedNumber
              value={derived.value}
              format={(n) => fmt(n, 2)}
              className="text-hero-number mt-3 block text-light max-md:!text-4xl"
            />

            {/* delta chips */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                  dayUp ? 'bg-emerald/10 text-emerald' : 'bg-crimson/10 text-crimson',
                )}
              >
                {dayUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {fmtSigned(derived.dayChange, 2)} · {dayUp ? '+' : '−'}
                {Math.abs(derived.dayPct * 100).toFixed(2)}% today
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut', delay: 0.28 }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                  gainUp ? 'bg-emerald/10 text-emerald' : 'bg-crimson/10 text-crimson',
                )}
              >
                {gainUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {fmtSigned(derived.gain, 2)} · {gainUp ? '+' : '−'}
                {fmtPct(Math.abs(derived.gainPct))} all-time
              </motion.span>
            </div>

            {/* under-strip mini stats */}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-4">
              <MiniStat label="Cost basis" value={fmt(derived.cost)} />
              <span className="h-4 w-px bg-white/[0.08]" />
              <MiniStat label="Day range" value={`${fmt(derived.lo)} – ${fmt(derived.hi)}`} />
              <span className="h-4 w-px bg-white/[0.08]" />
              <MiniStat label="Positions" value={String(holdings.length)} />
              <span className="ml-auto hidden text-[10px] text-dim/60 sm:block">updated {fmtTime(updatedAt)}</span>
            </div>
          </div>

          {/* right zone 60%: performance chart (desktop) */}
          <div className="hidden min-w-0 lg:block lg:w-[60%]">
            <PerformanceChart
              computeSeries={computeSeries}
              costBasis={derived.cost}
              height={252}
              idSuffix="hero"
              yOrientation="right"
            />
          </div>
        </div>
      </motion.section>

      {/* performance chart — own card under 1024px */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.06 }}
        className="card-chrome col-span-12 p-5 lg:hidden"
      >
        <PerformanceChart
          computeSeries={computeSeries}
          costBasis={derived.cost}
          height={280}
          idSuffix="hero-mobile"
          yOrientation="right"
        />
      </motion.section>

      {/* ===================== ALLOCATION + HOLDINGS ===================== */}
      <AllocationCard holdings={holdings} />
      <HoldingsTable
        holdings={holdings}
        flash={flash}
        savedAt={updatedAt}
        onSelect={(h) => setDrawerId(h.id)}
        onEdit={openEdit}
        onDelete={askDelete}
      />

      {/* ========================= MOVERS STRIP ========================= */}
      <MoversStrip holdings={holdings} onSelect={(h) => setDrawerId(h.id)} />

      {/* ===================== MODAL / DRAWER / CONFIRM ===================== */}
      <HoldingModal
        open={modal.open}
        editing={modal.editing}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onDelete={askDelete}
        onSaved={onSaved}
      />
      <HoldingDrawer
        holdingId={drawerId}
        holdings={holdings}
        totalValue={derived.value}
        onClose={() => setDrawerId(null)}
        onEdit={openEdit}
        onDelete={askDelete}
      />
      <ConfirmDialog
        open={confirmDel !== null}
        title={`Delete ${confirmDel?.ticker ?? 'this holding'}?`}
        body={
          confirmDel
            ? `${confirmDel.name} (${confirmDel.shares} shares) will be removed from your portfolio. You can undo for a few seconds after deleting.`
            : ''
        }
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) deleteHolding(confirmDel.id)
          setDrawerId((id) => (confirmDel && id === confirmDel.id ? null : id))
        }}
      />
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-dim">{label}</span>
      <span className="text-data-sm text-light">{value}</span>
    </div>
  )
}
