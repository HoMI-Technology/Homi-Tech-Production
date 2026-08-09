"use client";

/* Decision calendar — the agenda list ("Next 21 / 28 days"). */

import { useMemo } from 'react'
import { List, Receipt } from 'lucide-react'
import { cn } from "@/lib/planner/cn"
import type { Bill, Transaction } from '@/lib/planner/types'
import type { CalendarFilter } from '@/lib/planner/calendar'
import {
  billState,
  buildAgendaDays,
  dayHeaderLabel,
  money2,
} from '@/lib/planner/calendar'
import { BillStateChip, EventDot } from './shared'

export default function AgendaList({
  today,
  selectedISO,
  bills,
  transactions,
  filter,
  comfort,
  onSelect,
}: {
  today: string
  selectedISO: string
  bills: Bill[]
  transactions: Transaction[]
  filter: CalendarFilter
  comfort: boolean
  onSelect: (dateISO: string) => void
}) {
  const count = comfort ? 28 : 21
  const days = useMemo(
    () => buildAgendaDays(bills, transactions, today, count),
    [bills, transactions, today, count],
  )

  const visible = days.filter((d) => {
    switch (filter) {
      case 'bills':
        return d.bills.length > 0
      case 'income':
        return d.rollup.in > 0
      case 'spend':
        return d.rollup.out > 0
      case 'all':
      default:
        return true
    }
  })

  return (
    <div className="min-w-0 flex-1">
      <h3 className="mb-3 flex items-center gap-2 font-serif text-base italic text-light">
        <List className="h-4 w-4 text-cyan" />
        Next {count} days
      </h3>

      {visible.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/[0.1] px-4 py-6 text-center text-xs text-dim">
          Nothing in this window.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {visible.map((d) => {
          const selected = d.dateISO === selectedISO
          return (
            <button
              key={d.dateISO}
              type="button"
              onClick={() => onSelect(d.dateISO)}
              className={cn(
                'w-full rounded-xl border p-3 text-left transition-colors',
                selected
                  ? 'border-cyan/60 bg-cyan/[0.07]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]',
              )}
            >
              <span className="flex items-center gap-2">
                <EventDot kind="spend" className="shrink-0" />
                <span className="text-sm font-medium text-light">
                  {dayHeaderLabel(d.dateISO)}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  {d.billsTotal > 0 && (
                    <span className="rounded-full bg-yellow/10 px-2 py-0.5 font-display text-3xs tabular-nums text-yellow">
                      Bills {money2(d.billsTotal)}
                    </span>
                  )}
                  <span className="text-2xs text-dim">
                    {d.offsetDays === 0 ? 'Today' : `In ${d.offsetDays}d`}
                  </span>
                </span>
              </span>

              {(filter === 'all' || filter === 'bills') &&
                d.bills.map((b) => (
                  <span
                    key={b.id}
                    className="mt-2 flex items-center gap-2 border-t border-white/[0.05] pt-2"
                  >
                    <Receipt className="h-3.5 w-3.5 shrink-0 text-yellow/80" />
                    <span className="truncate text-sm text-light/90">{b.name}</span>
                    <BillStateChip state={billState(b, today)} />
                    <span className="ml-auto font-display text-sm tabular-nums text-light">
                      {money2(b.amount)}
                    </span>
                  </span>
                ))}

              {(filter === 'income' || filter === 'spend') &&
                d.rollup.txItems
                  .filter((t) =>
                    filter === 'income' ? t.type === 'income' : t.type === 'expense',
                  )
                  .map((t) => (
                    <span
                      key={t.id}
                      className="mt-2 flex items-center gap-2 border-t border-white/[0.05] pt-2"
                    >
                      <EventDot kind={t.type === 'income' ? 'income' : 'spend'} />
                      <span className="truncate text-sm text-light/90">
                        {t.note ?? t.category}
                      </span>
                      <span
                        className={cn(
                          'ml-auto font-display text-sm tabular-nums',
                          t.type === 'income' ? 'text-emerald' : 'text-crimson',
                        )}
                      >
                        {t.type === 'income' ? '+' : '-'}
                        {money2(t.amount)}
                      </span>
                    </span>
                  ))}
            </button>
          )
        })}
      </div>
    </div>
  )
}
