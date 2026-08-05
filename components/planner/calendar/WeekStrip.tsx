"use client";

/* Decision calendar — the 7-column week strip. */

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from "@/lib/planner/cn"
import type { Bill, Transaction } from '@/lib/planner/types'
import {
  buildWeekDays,
  dayRollup,
  openBillsDueOn,
  weekNetLabel,
  weekRangeLabel,
} from '@/lib/planner/calendar'
import { compactMoney } from '@/lib/planner/calendar'

export default function WeekStrip({
  anchorISO,
  today,
  selectedISO,
  bills,
  transactions,
  comfort,
  onSelect,
  onShiftWeek,
}: {
  anchorISO: string
  today: string
  selectedISO: string
  bills: Bill[]
  transactions: Transaction[]
  comfort: boolean
  onSelect: (dateISO: string) => void
  onShiftWeek: (delta: number) => void
}) {
  const days = useMemo(() => buildWeekDays(anchorISO, today), [anchorISO, today])

  return (
    <div className="min-w-0 flex-1">
      {/* Week nav */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => onShiftWeek(-1)}
          className="rounded-lg border border-white/[0.06] p-1.5 text-dim transition-colors hover:border-cyan/40 hover:text-cyan"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="font-serif text-xl italic text-light">
          {weekRangeLabel(anchorISO)}
        </h3>
        <button
          type="button"
          aria-label="Next week"
          onClick={() => onShiftWeek(1)}
          className="rounded-lg border border-white/[0.06] p-1.5 text-dim transition-colors hover:border-cyan/40 hover:text-cyan"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const rollup = dayRollup(day.dateISO, bills, transactions)
          const dueBills = openBillsDueOn(day.dateISO, bills)
          const selected = day.dateISO === selectedISO
          return (
            <button
              key={day.dateISO}
              type="button"
              onClick={() => onSelect(day.dateISO)}
              className={cn(
                'flex min-w-0 flex-col rounded-xl border p-2 text-left transition-colors',
                comfort ? 'min-h-[110px]' : 'min-h-[150px]',
                selected
                  ? 'border-cyan/60 bg-cyan/[0.06]'
                  : 'border-white/[0.05] bg-white/[0.015] hover:border-white/[0.12]',
              )}
            >
              <span
                className={cn(
                  'text-[9px] font-medium uppercase tracking-[0.16em]',
                  day.isToday ? 'text-cyan' : 'text-dim',
                )}
              >
                {
                  ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][
                    new Date(`${day.dateISO}T12:00:00`).getDay()
                  ]
                }
              </span>
              <span
                className={cn(
                  'mt-0.5 text-right font-display text-lg tabular-nums sm:text-xl',
                  day.isToday ? 'text-cyan' : 'text-light',
                )}
              >
                {day.day}
              </span>
              <span
                className={cn(
                  'mt-1 font-display text-[9px] tabular-nums sm:text-[10px]',
                  rollup.impact === 0
                    ? 'text-dim/70'
                    : rollup.impact > 0
                      ? 'text-emerald'
                      : 'text-yellow',
                )}
              >
                {weekNetLabel(rollup.impact)}
              </span>
              <span className="mt-auto flex flex-col gap-0.5 pt-2">
                {dueBills.slice(0, 2).map((b) => (
                  <span
                    key={b.id}
                    className="flex max-w-full items-center justify-between gap-1 truncate rounded bg-yellow/15 px-1 py-0.5 text-[9px] font-medium leading-tight text-yellow"
                  >
                    <span className="truncate">{b.name.charAt(0)}…</span>
                    <span className="shrink-0 font-display tabular-nums">
                      -{compactMoney(b.amount)}
                    </span>
                  </span>
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 text-right text-[11px] text-dim/70">
        M month · W week · A agenda · arrows move · T today
      </div>
    </div>
  )
}
