"use client";

/* ------------------------------------------------------------------ */
/* PortfolioPanel — investment portfolio card (planner spec §6).        */
/*                                                                      */
/* Holdings table/cards with unrealized gain (emerald up / crimson      */
/* down), allocation donut (Recharts, strokes via PLANNER_CATEGORY_HEX  */
/* through wealth-derive), add/edit/delete forms, and the Mark prices   */
/* demo refresh. Demo parity: market value $57,077.95 · cost basis      */
/* $44,213.00 · unrealized +$12,865 (+29.1%).                           */
/* ------------------------------------------------------------------ */

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowUpRight,
  LineChart,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import ChartTooltip from "@/components/planner/ui/ChartTooltip"
import ConfirmDialog from "@/components/planner/ui/ConfirmDialog"
import { summarizePortfolio, todayISO } from '@/lib/planner/derived'
import type {
  AssetClass,
  Holding,
  HoldingAccountKind,
} from '@/lib/planner/types'
import { formatCurrency, formatPercent } from '@/lib/tools/format'
import { usePlannerStore } from "@/lib/planner/store"
import {
  ACCOUNT_KIND_IDS,
  ACCOUNT_KIND_LABEL,
  ASSET_CLASS_CHIP,
  ASSET_CLASS_IDS,
  ASSET_CLASS_LABEL,
  allocationRows,
  formatSignedGain,
  holdingRows,
} from './wealth-derive'

const inputCls =
  'w-full rounded-xl border border-white/[0.08] bg-navy/70 px-3 py-2 text-sm text-light outline-none transition-colors placeholder:text-dim/60 focus:border-cyan/50'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-label">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

/* ------------------------------------------------------------------ */
/* Holding form (add + edit)                                           */
/* ------------------------------------------------------------------ */

interface HoldingFormState {
  symbol: string
  name: string
  assetClass: AssetClass
  accountKind: HoldingAccountKind
  shares: string
  costBasis: string
  price: string
}

function holdingFormFrom(holding: Holding | null): HoldingFormState {
  return {
    symbol: holding?.symbol ?? '',
    name: holding?.name ?? '',
    assetClass: holding?.assetClass ?? 'etf',
    accountKind: holding?.accountKind ?? 'brokerage',
    shares: holding ? String(holding.shares) : '',
    costBasis: holding ? String(holding.costBasis) : '',
    price: holding ? String(holding.price) : '',
  }
}

function HoldingForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: HoldingFormState
  submitLabel: string
  onSubmit: (form: HoldingFormState) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const set = <K extends keyof HoldingFormState>(
    key: K,
    value: HoldingFormState[K],
  ) => setForm((f) => ({ ...f, [key]: value }))
  const shares = Number(form.shares)
  const costBasis = Number(form.costBasis)
  const price = Number(form.price)
  const valid =
    form.symbol.trim().length > 0 &&
    Number.isFinite(shares) &&
    shares > 0 &&
    Number.isFinite(costBasis) &&
    costBasis >= 0 &&
    Number.isFinite(price) &&
    price >= 0

  return (
    <form
      className="mt-4 rounded-2xl border border-cyan/15 bg-navyLight/70 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSubmit(form)
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Symbol">
          <input
            className={inputCls}
            placeholder="e.g. VTI"
            value={form.symbol}
            onChange={(e) => set('symbol', e.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Name">
          <input
            className={inputCls}
            placeholder="e.g. Vanguard Total Stock"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
        <Field label="Asset class">
          <select
            className={inputCls}
            value={form.assetClass}
            onChange={(e) => set('assetClass', e.target.value as AssetClass)}
          >
            {ASSET_CLASS_IDS.map((c) => (
              <option key={c} value={c}>
                {ASSET_CLASS_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Account">
          <select
            className={inputCls}
            value={form.accountKind}
            onChange={(e) =>
              set('accountKind', e.target.value as HoldingAccountKind)
            }
          >
            {ACCOUNT_KIND_IDS.map((k) => (
              <option key={k} value={k}>
                {ACCOUNT_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Shares">
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="0"
            value={form.shares}
            onChange={(e) => set('shares', e.target.value)}
          />
        </Field>
        <Field label="Cost basis / share">
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="0.00"
            value={form.costBasis}
            onChange={(e) => set('costBasis', e.target.value)}
          />
        </Field>
        <Field label="Marked price">
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="0.00"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm font-medium text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
        >
          Cancel
        </button>
        <motion.button
          type="submit"
          disabled={!valid}
          whileHover={valid ? { scale: 1.02 } : undefined}
          whileTap={valid ? { scale: 0.97 } : undefined}
          className="rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-glow-cyan disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitLabel}
        </motion.button>
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/* Holding row                                                         */
/* ------------------------------------------------------------------ */

function HoldingRow({
  row,
  onEdit,
  onDelete,
}: {
  row: ReturnType<typeof holdingRows>[number]
  onEdit: () => void
  onDelete: () => void
}) {
  const { holding, marketValue, gain, gainPct } = row
  const up = gain >= 0
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-navyLight/50 p-4"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-sm font-semibold text-cyan">
            {holding.symbol}
          </span>
          <span className="rounded-full border border-white/[0.1] bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-dim">
            {ASSET_CLASS_CHIP[holding.assetClass]}
          </span>
          <span className="rounded-full border border-cyan/20 bg-cyan/[0.06] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-cyan/80">
            {ACCOUNT_KIND_LABEL[holding.accountKind]}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-light/90">{holding.name}</p>
        <p className="mt-0.5 text-xs text-dim">
          {holding.shares} sh · basis{' '}
          {formatCurrency(holding.costBasis, { decimals: 2 })} · as of{' '}
          {holding.asOf}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="text-right">
          <p className="font-display text-base font-semibold tnum text-light">
            {formatCurrency(marketValue, { decimals: 2 })}
          </p>
          <p
            className={`mt-0.5 inline-flex items-center gap-1 font-display text-xs tnum ${
              up ? 'text-emerald' : 'text-crimson'
            }`}
          >
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {formatSignedGain(gain, gainPct)}
          </p>
          <p className="mt-0.5 font-display text-xs tnum text-cyan">
            Price {formatCurrency(holding.price, { decimals: 2 })}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${holding.symbol}`}
          className="rounded-xl p-2 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${holding.symbol}`}
          className="rounded-xl p-2 text-dim transition-colors hover:bg-crimson/10 hover:text-crimson"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Allocation donut                                                    */
/* ------------------------------------------------------------------ */

function AllocationDonut({ holdings }: { holdings: Holding[] }) {
  const rows = useMemo(() => allocationRows(holdings), [holdings])
  if (rows.length === 0) return null
  return (
    <div className="mt-5 grid items-center gap-4 sm:grid-cols-[220px_1fr]">
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="label"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {rows.map((r) => (
                <Cell key={r.assetClass} fill={r.hex} />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  format={(n) => formatCurrency(n, { decimals: 2 })}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.assetClass} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: r.hex }}
            />
            <span className="text-light/90">{r.label}</span>
            <span className="ml-auto font-display text-xs tnum text-dim">
              {formatPercent(r.weight, 0)}
            </span>
            <span className="w-24 text-right font-display text-xs tnum text-light">
              {formatCurrency(r.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* PortfolioPanel                                                      */
/* ------------------------------------------------------------------ */

export function PortfolioPanel() {
  const holdings = usePlannerStore((s) => s.holdings)
  const addHolding = usePlannerStore((s) => s.addHolding)
  const updateHolding = usePlannerStore((s) => s.updateHolding)
  const deleteHolding = usePlannerStore((s) => s.deleteHolding)
  const markPrices = usePlannerStore((s) => s.markPrices)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Holding | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Holding | null>(null)
  const [marked, setMarked] = useState(false)

  const summary = summarizePortfolio(holdings)
  const rows = useMemo(() => holdingRows(holdings), [holdings])
  const gainUp = summary.gain >= 0

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.06, ease: 'easeOut' }}
      className="card-chrome p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan/25 bg-cyan/10 text-cyan shadow-[inset_0_1px_0_rgba(34,211,238,0.2)]">
            <LineChart size={16} aria-hidden />
          </span>
          <div>
            <h3 className="font-display text-lg tracking-tight text-light">
              Investment portfolio
            </h3>
            <p className="mt-0.5 max-w-md text-xs leading-relaxed text-dim">
              Holdings, allocation, and unrealized gain - marked prices, not
              live market feeds.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {holdings.length > 0 && (
            <button
              type="button"
              onClick={() => {
                markPrices()
                setMarked(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
            >
              <RefreshCw size={14} />
              Mark prices
            </button>
          )}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setEditing(null)
              setFormOpen((v) => !v)
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-glow-cyan"
          >
            <Plus size={14} />
            Add holding
          </motion.button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-navyLight/60 px-3.5 py-3">
          <p className="text-label">Market value</p>
          <p className="mt-1 font-display text-lg font-semibold tnum text-cyan">
            {formatCurrency(summary.marketValue, { decimals: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-navyLight/60 px-3.5 py-3">
          <p className="text-label">Cost basis</p>
          <p className="mt-1 font-display text-lg font-semibold tnum text-light">
            {formatCurrency(summary.costBasis, { decimals: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-navyLight/60 px-3.5 py-3">
          <p className="text-label">Unrealized</p>
          <p
            className={`mt-1 font-display text-lg font-semibold tnum ${
              gainUp ? 'text-emerald' : 'text-crimson'
            }`}
          >
            {formatSignedGain(summary.gain, summary.gainPct)}
          </p>
        </div>
      </div>

      {marked && (
        <p className="mt-3 text-xs text-cyan">
          Prices marked as of {todayISO()} — demo refresh, not a live feed.
        </p>
      )}

      {formOpen && !editing && (
        <HoldingForm
          initial={holdingFormFrom(null)}
          submitLabel="Save holding"
          onSubmit={(form) => {
            addHolding({
              symbol: form.symbol.trim().toUpperCase(),
              name: form.name.trim() || form.symbol.trim().toUpperCase(),
              assetClass: form.assetClass,
              accountKind: form.accountKind,
              shares: Number(form.shares),
              costBasis: Number(form.costBasis),
              price: Number(form.price),
              asOf: todayISO(),
              source: 'manual',
            })
            setFormOpen(false)
          }}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {holdings.length > 0 && <AllocationDonut holdings={holdings} />}

      <div className="mt-5 flex flex-col gap-2.5">
        {rows.map((row) =>
          editing?.id === row.holding.id ? (
            <HoldingForm
              key={row.holding.id}
              initial={holdingFormFrom(row.holding)}
              submitLabel="Save changes"
              onSubmit={(form) => {
                updateHolding(row.holding.id, {
                  symbol: form.symbol.trim().toUpperCase(),
                  name: form.name.trim() || form.symbol.trim().toUpperCase(),
                  assetClass: form.assetClass,
                  accountKind: form.accountKind,
                  shares: Number(form.shares),
                  costBasis: Number(form.costBasis),
                  price: Number(form.price),
                })
                setEditing(null)
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <HoldingRow
              key={row.holding.id}
              row={row}
              onEdit={() => {
                setFormOpen(false)
                setEditing(row.holding)
              }}
              onDelete={() => setConfirmDelete(row.holding)}
            />
          ),
        )}
        {holdings.length === 0 && !formOpen && (
          <div className="rounded-2xl border border-dashed border-white/[0.12] px-4 py-8 text-center">
            <p className="font-display text-lg tracking-tight text-light/90">
              No holdings yet — add a position or link a broker.
            </p>
            <p className="mt-1 text-xs text-dim">
              Marked prices only; portfolio value rolls into net worth and the
              HōMI-Score.
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete holding?"
        body={
          confirmDelete
            ? `${confirmDelete.symbol} (${confirmDelete.shares} sh) will be removed from the portfolio. Net worth and readiness update live.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete) deleteHolding(confirmDelete.id)
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </motion.section>
  )
}

export default PortfolioPanel
