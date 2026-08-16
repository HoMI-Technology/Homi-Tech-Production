import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TEMP_HEX, fmt, fmtPct, monthlySeries, savingsTemperature, useBudget } from '@/store/budget'
import type { Temperature } from '@/store/budget'
import ChartTooltip from '@/components/ChartTooltip'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const AXIS_TICK = { fill: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em' } as const

type RatePoint = { label: string; rate: number }
type FlowPoint = { label: string; income: number; spending: number; net: number }

type HoverState = { activeTooltipIndex?: number | string }

function hoverIndexOf(s: HoverState | null): number | null {
  const i = s?.activeTooltipIndex
  return typeof i === 'number' ? i : typeof i === 'string' && i !== '' && !Number.isNaN(Number(i)) ? Number(i) : null
}

/* -------- savings-rate tooltip: month + rate + temperature word -------- */

const TEMP_WORD_LOCAL: Record<Temperature, string> = {
  emerald: 'Healthy',
  yellow: 'Caution',
  amber: 'Watch',
  crimson: 'At risk',
}

function SavingsTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean
  label?: string | number
  payload?: { value?: number | string }[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const v = payload[0]?.value
  const rate = typeof v === 'number' ? v : 0
  const temp = savingsTemperature(rate)
  return (
    <div className="rounded-xl border border-white/[0.1] bg-navyLight/95 px-3 py-2 shadow-xl backdrop-blur">
      {label !== undefined && <p className="text-label mb-1.5">{String(label)}</p>}
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: TEMP_HEX[temp] }} />
        <span className="text-xs text-dim">Savings rate</span>
        <span className="text-data-sm ml-auto pl-4 text-light">{fmtPct(rate)}</span>
      </div>
      <p className="mt-1 text-[11px] font-semibold" style={{ color: TEMP_HEX[temp] }}>
        {TEMP_WORD_LOCAL[temp]}
      </p>
    </div>
  )
}

/** Linked trend charts — goals.md §7. Hover in one highlights the month in the other. */
export default function TrendCharts() {
  const { state } = useBudget()
  const [hover, setHover] = useState<number | null>(null)

  const rateData = useMemo<RatePoint[]>(
    () =>
      monthlySeries(state, 6).map((p) => ({
        label: p.label,
        rate: p.income > 0 ? p.net / p.income : 0,
      })),
    [state],
  )

  const flowData = useMemo<FlowPoint[]>(
    () =>
      monthlySeries(state, 6).map((p) => ({
        label: p.label,
        income: p.income,
        spending: p.spending,
        net: p.net,
      })),
    [state],
  )

  const hoverLabel = hover !== null ? (rateData[hover]?.label ?? null) : null

  const linkHandlers = {
    onMouseMove: (s: HoverState | null) => {
      const i = hoverIndexOf(s)
      if (i !== null) setHover(i)
    },
    onMouseLeave: () => setHover(null),
  }

  return (
    <div className="col-span-12 flex flex-col gap-4 xl:col-span-7">
      {/* savings rate trend */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.35, delay: 0.06, ease: EASE }}
        className="card-chrome p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-h2">Savings rate trend</h2>
            <p className="mt-0.5 text-xs text-dim">Share of income kept each month · 20% is the HōMI mark</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-dim">
            <span className="h-2 w-2 rounded-full bg-emerald" />
            Savings rate
          </span>
        </div>
        <div className="mt-4 h-[220px] max-sm:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rateData} margin={{ top: 8, right: 8, bottom: 0, left: -4 }} {...linkHandlers}>
              <defs>
                <linearGradient id="sr-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(226,232,240,0.05)" />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} dy={6} />
              <YAxis
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={<SavingsTooltip />} cursor={{ stroke: 'rgba(226,232,240,0.2)', strokeDasharray: '4 4' }} />
              <ReferenceLine
                y={0.2}
                stroke="#34d399"
                strokeOpacity={0.45}
                strokeDasharray="5 4"
                label={{ value: 'target 20%', position: 'insideTopRight', fill: '#94a3b8', fontSize: 10, letterSpacing: '0.12em' }}
              />
              {hoverLabel && (
                <ReferenceLine x={hoverLabel} stroke="rgba(34,211,238,0.35)" strokeDasharray="3 3" />
              )}
              <Area
                type="monotone"
                dataKey="rate"
                name="Savings rate"
                stroke="#34d399"
                strokeWidth={2.5}
                fill="url(#sr-fill)"
                animationDuration={900}
                style={{ filter: 'drop-shadow(0 0 6px rgba(52,211,153,0.35))' }}
                dot={{ r: 3, fill: '#34d399', stroke: '#0f172a', strokeWidth: 1.5 }}
                activeDot={{ r: 4, fill: '#34d399', stroke: '#0f172a', strokeWidth: 1.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      {/* income vs spending */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.35, delay: 0.12, ease: EASE }}
        className="card-chrome p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-h2">Income vs spending</h2>
            <p className="mt-0.5 text-xs text-dim">Monthly totals, last 6 months · net overlaid</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-dim">
              <span className="h-2 w-2 rounded-full bg-cyan" />
              Income
            </span>
            <span className="flex items-center gap-1.5 text-xs text-dim">
              <span className="h-2 w-2 rounded-full bg-crimson" />
              Spending
            </span>
            <span className="flex items-center gap-1.5 text-xs text-dim">
              <span className="h-2 w-2 rounded-full bg-emerald" />
              Net
            </span>
          </div>
        </div>
        <div className="mt-4 h-[220px] max-sm:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={flowData} margin={{ top: 8, right: 8, bottom: 0, left: -4 }} barCategoryGap="30%" {...linkHandlers}>
              <CartesianGrid vertical={false} stroke="rgba(226,232,240,0.05)" />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} dy={6} />
              <YAxis
                tickFormatter={(v: number) => `$${Math.abs(v) >= 1000 ? `${v / 1000}k` : Math.round(v)}`}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={<ChartTooltip format={(n) => fmt(n)} />} cursor={{ fill: 'rgba(226,232,240,0.04)' }} />
              <ReferenceLine y={0} stroke="rgba(226,232,240,0.15)" />
              {hoverLabel && (
                <ReferenceLine x={hoverLabel} stroke="rgba(34,211,238,0.35)" strokeDasharray="3 3" />
              )}
              <Bar dataKey="income" name="Income" fill="#22d3ee" barSize={8} radius={[4, 4, 0, 0]} animationDuration={600} />
              <Bar dataKey="spending" name="Spending" fill="#f24822" barSize={8} radius={[4, 4, 0, 0]} animationDuration={600} animationBegin={60} />
              <Line
                type="monotone"
                dataKey="net"
                name="Net"
                stroke="#34d399"
                strokeWidth={2}
                strokeDasharray="4 4"
                animationDuration={900}
                dot={false}
                activeDot={{ r: 3, fill: '#34d399', stroke: 'none' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.section>
    </div>
  )
}
