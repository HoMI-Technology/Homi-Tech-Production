"use client";


import { COLORS } from "@/lib/brand";
/* Decision calendar — PROJECTED CASH RUNWAY card + filter chip rail. */

import { useMemo } from 'react'
import {
  Area,
  Bar,
  ComposedChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from "@/lib/planner/cn"
import type {
  CalendarFilter,
  FilterCounts,
  RunwaySeries,
} from '@/lib/planner/calendar'
import { money2, monthLabel } from '@/lib/planner/calendar'
import { CARD, EYEBROW_DIM } from './shared'

const CYAN = COLORS.cyan

const FILTERS: { key: CalendarFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bills', label: 'Bills' },
  { key: 'income', label: 'Income' },
  { key: 'spend', label: 'Spend' },
]

export function FilterChips({
  counts,
  active,
  onSelect,
}: {
  counts: FilterCounts
  active: CalendarFilter
  onSelect: (f: CalendarFilter) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 xl:w-[150px] xl:flex-col">
      {FILTERS.map((f) => {
        const isActive = active === f.key
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onSelect(f.key)}
            className={cn(
              'flex items-center justify-between gap-3 rounded-full border px-3.5 py-1.5 text-xs transition-colors xl:rounded-lg',
              isActive
                ? 'border-cyan/50 bg-cyan/15 text-cyan'
                : 'border-white/[0.08] bg-white/[0.02] text-dim hover:text-light',
            )}
          >
            <span>{f.label}</span>
            <span className="font-display text-3xs tabular-nums">{counts[f.key]}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function RunwayCard({
  series,
  cashNow,
  onJump,
}: {
  series: RunwaySeries
  cashNow: number
  onJump: (dateISO: string) => void
}) {
  const data = useMemo(
    () => series.points.map((p) => ({ day: p.day, cash: p.cash, net: p.net, dateISO: p.dateISO })),
    [series],
  )

  return (
    <div className={cn(CARD, 'min-w-0 flex-1 p-4')}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className={EYEBROW_DIM}>Projected cash runway</p>
          <h3 className="mt-1 font-serif text-lg italic text-light">
            {monthLabel(series.month)}
          </h3>
        </div>
        <div className="text-right">
          <p className={EYEBROW_DIM}>Bank cash now</p>
          <p className="mt-1 font-display text-sm font-semibold tabular-nums text-cyan">
            {money2(cashNow)}
          </p>
        </div>
      </div>

      <div className="mt-3 h-[140px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
            onClick={(s) => {
              const iso = (
                s as
                  | { activePayload?: Array<{ payload?: { dateISO?: string } }> }
                  | undefined
              )?.activePayload?.[0]?.payload?.dateISO
              if (iso) onJump(iso)
            }}
          >
            <defs>
              <linearGradient id="runwayFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CYAN} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CYAN} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" hide />
            <YAxis
              hide
              domain={[
                (dataMin: number) => dataMin - Math.max(dataMin * 0.02, 100),
                (dataMax: number) => dataMax + Math.max(dataMax * 0.02, 100),
              ]}
            />
            <Bar dataKey="net" fill={CYAN} fillOpacity={0.45} isAnimationActive={false} />
            <Area
              type="stepAfter"
              dataKey="cash"
              stroke={CYAN}
              strokeWidth={1.5}
              fill="url(#runwayFill)"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-dim">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-cyan" />
          Projected cash
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-[2px] bg-cyan/50" />
          Daily net
        </span>
        <span className="text-dim/70">
          Click a bar to jump · arrows navigate · T today
        </span>
      </div>
    </div>
  )
}
