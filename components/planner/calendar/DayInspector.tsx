"use client";

/* Decision calendar — the SELECTED DAY inspector rail. */

import { useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarPlus,
  CircleDot,
  Clock,
  CreditCard,
  Plus,
  Receipt,
  X,
} from 'lucide-react'
import { cn } from "@/lib/planner/cn"
import { usePlannerStore } from "@/lib/planner/store"
import { payBillWithImpact } from '@/lib/planner/closed-loop'
import { daysUntil } from '@/lib/planner/derived'
import {
  billState,
  buildUpcoming,
  categoryLabel,
  dayHeaderLabel,
  dayRollup,
  isWeekendISO,
  money2,
  monthPressureMax,
  monthOfISO,
  pressureRatio,
  projectedCashOn,
  shortDateLabel,
} from '@/lib/planner/calendar'
import type { Bill, Transaction } from '@/lib/planner/types'
import { BillStateChip, CARD, EventDot, FIELD_LABEL, SELECT_CLASS, SectionCard, SUBCARD } from './shared'
import { AddBillForm, LogSpendForm } from './DayForms'

export default function DayInspector({
  selectedISO,
  today,
  bills,
  transactions,
  cashNow,
}: {
  selectedISO: string
  today: string
  bills: Bill[]
  transactions: Transaction[]
  cashNow: number
}) {
  const accounts = usePlannerStore((s) => s.accounts)
  const scheduleBill = usePlannerStore((s) => s.scheduleBill)
  const [payFromId, setPayFromId] = useState<string | null>(null)
  const [openForm, setOpenForm] = useState<'bill' | 'spend' | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)

  const rollup = useMemo(
    () => dayRollup(selectedISO, bills, transactions),
    [selectedISO, bills, transactions],
  )
  const proj = projectedCashOn(selectedISO, cashNow, bills)
  const maxPressure = useMemo(
    () => monthPressureMax(monthOfISO(selectedISO), bills, transactions),
    [selectedISO, bills, transactions],
  )
  const pressure = pressureRatio(rollup.pressure, maxPressure)
  const upcoming = useMemo(() => buildUpcoming(bills, today), [bills, today])

  const payFrom =
    accounts.find((a) => a.id === payFromId) ??
    accounts.find((a) => a.type !== 'credit') ??
    accounts[0]

  const daysAway = daysUntil(selectedISO, today)
  const weekend = isWeekendISO(selectedISO)

  const toggleForm = (form: 'bill' | 'spend') => {
    setOpenForm((cur) => (cur === form ? null : form))
    setFlash(null)
  }
  const savedFlash = (msg: string) => {
    setFlash(msg)
    setPayError(null)
  }

  const payNow = async (bill: Bill) => {
    const result = await payBillWithImpact(bill.id, payFrom?.id)
    if (!result.ok) {
      setPayError(result.error ?? 'Payment failed')
      setFlash(null)
    } else {
      setPayError(null)
      setFlash(`✓ ${bill.name} paid. Ledger, cash & readiness updated.`)
    }
  }

  return (
    <div className="flex w-full flex-col gap-4 xl:w-[360px] xl:shrink-0">
      {/* Header card */}
      <div className={cn(CARD, 'p-4')}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-3xs font-medium uppercase tracking-[0.22em] text-dim">
              Selected day
            </p>
            <h3 className="mt-1 font-serif text-2xl italic text-light">
              {dayHeaderLabel(selectedISO)}
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {daysAway === 0 && (
                <span className="rounded-full bg-emerald/20 px-2 py-0.5 text-3xs font-semibold uppercase tracking-[0.14em] text-emerald">
                  Today
                </span>
              )}
              {daysAway > 0 && (
                <span className="rounded-full border border-cyan/40 px-2 py-0.5 text-3xs font-semibold uppercase tracking-[0.14em] text-cyan">
                  In {daysAway}d
                </span>
              )}
              {daysAway < 0 && (
                <span className="rounded-full border border-white/[0.1] px-2 py-0.5 text-3xs font-semibold uppercase tracking-[0.14em] text-dim">
                  {-daysAway}d ago
                </span>
              )}
              {weekend && (
                <span className="rounded-full border border-emerald/30 px-2 py-0.5 text-3xs font-semibold uppercase tracking-[0.14em] text-emerald/80">
                  Weekend
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xs font-medium uppercase tracking-[0.22em] text-dim">
              Day impact
            </p>
            <p
              className={cn(
                'mt-1 font-display text-2xl font-semibold tabular-nums',
                rollup.impact < 0 ? 'text-crimson' : 'text-emerald',
              )}
            >
              {rollup.impact < 0 ? '-' : '+'}
              {money2(Math.abs(rollup.impact))}
            </p>
            <p className="mt-0.5 font-display text-2xs tabular-nums text-dim">
              Proj {money2(proj)}
            </p>
          </div>
        </div>

        {/* IN / OUT / BILLS tiles */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className={cn(SUBCARD, 'p-2.5')}>
            <p className="flex items-center gap-1 text-3xs font-medium uppercase tracking-[0.14em] text-dim">
              <ArrowDownLeft className="h-3 w-3" /> In
            </p>
            <p className="mt-1 font-display text-sm tabular-nums text-emerald">
              {money2(rollup.in)}
            </p>
          </div>
          <div className={cn(SUBCARD, 'p-2.5')}>
            <p className="flex items-center gap-1 text-3xs font-medium uppercase tracking-[0.14em] text-dim">
              <ArrowUpRight className="h-3 w-3" /> Out
            </p>
            <p className="mt-1 font-display text-sm tabular-nums text-light">
              {money2(rollup.out)}
            </p>
          </div>
          <div className={cn(SUBCARD, 'p-2.5')}>
            <p className="flex items-center gap-1 text-3xs font-medium uppercase tracking-[0.14em] text-dim">
              <Receipt className="h-3 w-3" /> Bills
            </p>
            <p className="mt-1 font-display text-sm tabular-nums text-yellow">
              {money2(rollup.bills)}
            </p>
          </div>
        </div>

        {/* Day pressure */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-3xs font-medium uppercase tracking-[0.18em] text-dim">
            <span>Day pressure</span>
            <span className="font-display tabular-nums">{money2(rollup.pressure)}</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow/70 to-yellow transition-all"
              style={{ width: `${Math.max(pressure * 100, rollup.pressure > 0 ? 3 : 0)}%` }}
            />
          </div>
        </div>

        {/* Pay from */}
        <div className="mt-4">
          <label className={FIELD_LABEL} htmlFor="cal-pay-from">Pay from</label>
          <select
            id="cal-pay-from"
            className={SELECT_CLASS}
            value={payFrom?.id ?? ''}
            onChange={(e) => setPayFromId(e.target.value)}
          >
            {accounts.length === 0 && <option value="">No accounts yet</option>}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {money2(a.balance)}
              </option>
            ))}
          </select>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => toggleForm('bill')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-colors',
              openForm === 'bill'
                ? 'border border-cyan/50 bg-cyan/10 text-cyan'
                : 'bg-cyan text-navy',
            )}
          >
            {openForm === 'bill' ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {openForm === 'bill' ? 'Close' : 'Add bill'}
          </button>
          <button
            type="button"
            onClick={() => toggleForm('spend')}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[0.1] py-2.5 text-sm font-medium text-light transition-colors hover:border-white/[0.2]"
          >
            {openForm === 'spend' ? <X className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
            {openForm === 'spend' ? 'Close' : 'Log spend'}
          </button>
        </div>

        {openForm === 'bill' && (
          <AddBillForm
            dateISO={selectedISO}
            accountId={payFrom?.id}
            onSaved={() => savedFlash('✓ Bill saved on this day.')}
          />
        )}
        {openForm === 'spend' && (
          <LogSpendForm
            dateISO={selectedISO}
            accountId={payFrom?.id}
            onSaved={() => savedFlash('✓ Expense logged on this day.')}
          />
        )}
        {flash && <p className="mt-3 text-xs font-medium text-emerald">{flash}</p>}
        {payError && <p className="mt-3 text-xs font-medium text-crimson">{payError}</p>}
      </div>

      {/* Bills on this day */}
      <SectionCard eyebrow="Bills" count={rollup.billItems.length} icon={<Receipt className="h-3.5 w-3.5 text-dim" />}>
        {rollup.billItems.length === 0 && (
          <p className="rounded-lg border border-dashed border-white/[0.1] px-3 py-4 text-center text-xs text-dim">
            No bills due on this day.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {rollup.billItems.map((b) => {
            const state = billState(b, today)
            return (
              <div key={b.id} className={cn(SUBCARD, 'p-3')}>
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-light">{b.name}</span>
                  <BillStateChip state={state} />
                  <span className="ml-auto font-display text-sm tabular-nums text-light">
                    {money2(b.amount)}
                  </span>
                </div>
                <p className="mt-1 text-2xs text-dim">
                  {categoryLabel(b.category)} · {b.autopay ? 'Autopay' : 'Manual'} · {b.frequency}
                </p>
                {state !== 'paid' && (
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => payNow(b)}
                      className="flex items-center gap-1.5 rounded-lg bg-cyan px-3 py-1.5 text-xs font-semibold text-navy"
                    >
                      <CreditCard className="h-3.5 w-3.5" /> Pay now
                    </button>
                    {state !== 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => scheduleBill(b.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-light hover:border-white/[0.2]"
                      >
                        <Clock className="h-3.5 w-3.5" /> Schedule
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* Ledger on this day */}
      <SectionCard eyebrow="Ledger" count={rollup.txItems.length} icon={<CircleDot className="h-3.5 w-3.5 text-dim" />}>
        {rollup.txItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/[0.1] px-3 py-5 text-center text-xs text-dim">
            No ledger entries on this day
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {rollup.txItems.map((t: Transaction) => (
              <div key={t.id} className="flex items-center gap-2.5 py-1">
                <EventDot kind={t.type === 'income' ? 'income' : 'spend'} className="shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-light">{t.note ?? categoryLabel(t.category)}</p>
                  <p className="text-2xs text-dim">
                    {categoryLabel(t.category)} · {t.source ?? 'manual'}
                  </p>
                </div>
                <span
                  className={cn(
                    'ml-auto font-display text-sm tabular-nums',
                    t.type === 'income' ? 'text-emerald' : 'text-crimson',
                  )}
                >
                  {t.type === 'income' ? '+' : '-'}
                  {money2(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Upcoming bills */}
      <SectionCard eyebrow="Upcoming" count={upcoming.length} icon={<CalendarPlus className="h-3.5 w-3.5 text-dim" />}>
        {upcoming.length === 0 && (
          <p className="rounded-lg border border-dashed border-white/[0.1] px-3 py-4 text-center text-xs text-dim">
            No open bills — closed loop is clear.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {upcoming.map((u) => (
            <div key={u.bill.id} className="flex items-center gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-light">{u.bill.name}</p>
                <p className="text-2xs text-dim">
                  {shortDateLabel(u.bill.dueDate)} · {u.label}
                </p>
              </div>
              <span className="ml-auto font-display text-sm tabular-nums text-yellow">
                {money2(u.bill.amount)}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
