"use client";

/* Decision calendar — the SUN–SAT month grid. */

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from "@/lib/planner/cn"
import type { Bill, Transaction } from '@/lib/planner/types'
import type { CalendarDay, CalendarFilter, MonthRef } from '@/lib/planner/calendar'
import {
  WEEKDAY_HEADERS,
  billState,
  buildMonthGrid,
  dayRollup,
  monthLabel,
  monthPressureMax,
  openBillsDueOn,
  pressureRatio,
  signedMoney2,
} from '@/lib/planner/calendar'
import type { DotKind } from './shared'
import { EventDot } from './shared'

/** Crimson cell-tint buckets by pressure ratio (token classes only). */
function pressureTint(ratio: number): string {
  if (ratio >= 0.66) return 'bg-crimson/[0.14]'
  if (ratio >= 0.33) return 'bg-crimson/[0.08]'
  if (ratio > 0) return 'bg-crimson/[0.04]'
  return ''
}

function cellChipClass(state: ReturnType<typeof billState>): string {
  switch (state) {
    case 'paid':
      return 'bg-emerald/15 text-emerald'
    case 'overdue':
      return 'bg-crimson/15 text-crimson'
    default:
      return 'bg-yellow/15 text-yellow'
  }
}

export default function MonthGrid({
  month,
  today,
  selectedISO,
  bills,
  transactions,
  filter,
  comfort,
  onSelect,
  onShiftMonth,
}: {
  month: MonthRef
  today: string
  selectedISO: string
  bills: Bill[]
  transactions: Transaction[]
  filter: CalendarFilter
  comfort: boolean
  onSelect: (dateISO: string) => void
  onShiftMonth: (delta: number) => void
}) {
  const weeks = useMemo(
    () => buildMonthGrid(month.year, month.month, today),
    [month, today],
  )
  const maxPressure = useMemo(
    () => monthPressureMax(month, bills, transactions),
    [month, bills, transactions],
  )

  const rollups = useMemo(() => {
    const map = new Map<string, ReturnType<typeof dayRollup>>()
    for (const week of weeks) {
      for (const day of week) {
        map.set(day.dateISO, dayRollup(day.dateISO, bills, transactions))
      }
    }
    return map
  }, [weeks, bills, transactions])

  return (
    <div className="min-w-0 flex-1">
      {/* Month nav */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onShiftMonth(-1)}
          className="rounded-lg border border-white/[0.06] p-1.5 text-dim transition-colors hover:border-cyan/40 hover:text-cyan"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="font-serif text-xl italic text-light">{monthLabel(month)}</h3>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => onShiftMonth(1)}
          className="rounded-lg border border-white/[0.06] p-1.5 text-dim transition-colors hover:border-cyan/40 hover:text-cyan"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {WEEKDAY_HEADERS.map((d) => (
          <span
            key={d}
            className="text-center text-[10px] font-medium uppercase tracking-[0.18em] text-dim"
          >
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d.charAt(0)}</span>
          </span>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex flex-col gap-1.5">
        {weeks.map((week) => (
          <div key={week[0].dateISO} className="grid grid-cols-7 gap-1.5">
            {week.map((day) => (
              <DayCell
                key={day.dateISO}
                day={day}
                rollup={rollups.get(day.dateISO)!}
                bills={bills}
                today={today}
                selected={day.dateISO === selectedISO}
                maxPressure={maxPressure}
                filter={filter}
                comfort={comfort}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend + keyboard hint */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-dim">
        <span className="flex items-center gap-1.5">
          <EventDot kind="overdue" /> Overdue
        </span>
        <span className="flex items-center gap-1.5">
          <EventDot kind="bill" /> Bill due
        </span>
        <span className="flex items-center gap-1.5">
          <EventDot kind="spend" /> Spend
        </span>
        <span className="flex items-center gap-1.5">
          <EventDot kind="income" /> Income / paid
        </span>
        <span className="ml-auto text-dim/70">
          M month · W week · A agenda · arrows move · T today
        </span>
      </div>
    </div>
  )
}

function DayCell({
  day,
  rollup,
  bills,
  today,
  selected,
  maxPressure,
  filter,
  comfort,
  onSelect,
}: {
  day: CalendarDay
  rollup: ReturnType<typeof dayRollup>
  bills: Bill[]
  today: string
  selected: boolean
  maxPressure: number
  filter: CalendarFilter
  comfort: boolean
  onSelect: (dateISO: string) => void
}) {
  const dueBills = openBillsDueOn(day.dateISO, bills)
  const ratio = pressureRatio(rollup.pressure, maxPressure)

  const dots: DotKind[] = []
  if (dueBills.some((b) => billState(b, today) === 'overdue')) dots.push('overdue')
  if (dueBills.some((b) => {
    const s = billState(b, today)
    return s !== 'overdue' && s !== 'paid'
  })) dots.push('bill')
  if (rollup.out > 0) dots.push('spend')
  if (rollup.in > 0 || dueBills.some((b) => billState(b, today) === 'paid')) {
    dots.push('income')
  }

  const showBills = filter === 'all' || filter === 'bills'
  const net = rollup.in - rollup.out

  return (
    <button
      type="button"
      onClick={() => onSelect(day.dateISO)}
      className={cn(
        'flex min-w-0 flex-col rounded-xl border text-left transition-colors',
        comfort ? 'min-h-[64px] p-1.5 sm:min-h-[76px]' : 'min-h-[72px] p-1.5 sm:min-h-[96px] sm:p-2',
        day.inMonth ? 'border-white/[0.05] bg-white/[0.015]' : 'border-transparent opacity-40',
        day.inMonth && pressureTint(ratio),
        selected
          ? 'border-cyan/60 bg-cyan/[0.06]'
          : day.isToday
            ? 'border-cyan/30 bg-cyan/[0.04]'
            : 'hover:border-white/[0.12]',
      )}
    >
      <span className="flex items-start justify-between">
        <span
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full font-display text-[11px] tabular-nums sm:h-6 sm:w-6 sm:text-xs',
            day.isToday ? 'bg-cyan text-navy font-semibold' : 'text-light/80',
          )}
        >
          {day.day}
        </span>
      </span>

      {/* Ledger aggregate (desktop only) */}
      {net !== 0 && (filter === 'all' || filter === 'income' || filter === 'spend') && (
        <span
          className={cn(
            'mt-0.5 hidden font-display text-[10px] tabular-nums sm:block',
            net > 0 ? 'text-emerald/80' : 'text-dim',
          )}
        >
          {signedMoney2(net).replace('.00', '')}
        </span>
      )}

      {/* Bill chips (desktop only) */}
      {showBills && dueBills.length > 0 && (
        <span className="mt-1 hidden flex-col gap-0.5 sm:flex">
          {dueBills.slice(0, 2).map((b) => (
            <span
              key={b.id}
              className={cn(
                'max-w-full truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight',
                cellChipClass(billState(b, today)),
              )}
            >
              {b.name}
            </span>
          ))}
          {dueBills.length > 2 && (
            <span className="px-1 text-[9px] text-dim">+{dueBills.length - 2}</span>
          )}
        </span>
      )}

      {/* Event dots */}
      {dots.length > 0 && (
        <span className="mt-auto flex gap-1 pt-1">
          {dots.map((kind) => (
            <EventDot key={kind} kind={kind} />
          ))}
        </span>
      )}
    </button>
  )
}
