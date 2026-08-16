import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmt, fmtCompact, fmtSigned } from '@/store/budget'
import type { RangeKey } from './investUtils'
import { RANGES, fullDateLabel, rangeDays, seriesDates, tickFormat } from './investUtils'
import { cn } from '@/lib/utils'

type Point = { i: number; value: number }

/**
 * Portfolio / position performance AreaChart with functional range tabs —
 * investments.md §3. 1M is the real seeded history; longer ranges are
 * synthesized deterministically upstream via `computeSeries`.
 */
export default function PerformanceChart({
  computeSeries,
  costBasis,
  height = 280,
  defaultRange = '1M',
  idSuffix,
  yOrientation = 'right',
  range,
  onRangeChange,
  showTabs = true,
}: {
  computeSeries: (days: number) => number[]
  costBasis?: number
  height?: number
  defaultRange?: RangeKey
  /** Unique suffix so gradient/layoutId don't collide across instances. */
  idSuffix: string
  yOrientation?: 'left' | 'right'
  range?: RangeKey
  onRangeChange?: (r: RangeKey) => void
  showTabs?: boolean
}) {
  const [internalRange, setInternalRange] = useState<RangeKey>(defaultRange)
  const activeRange = range ?? internalRange
  const setRange = (r: RangeKey) => {
    setInternalRange(r)
    onRangeChange?.(r)
  }

  const days = rangeDays(activeRange)
  const data: Point[] = useMemo(() => {
    const values = computeSeries(days)
    return values.map((v, i) => ({ i, value: v }))
  }, [computeSeries, days])
  const dates = useMemo(() => seriesDates(days), [days])
  const fmtTick = tickFormat(activeRange)

  const min = data.length > 0 ? Math.min(...data.map((d) => d.value)) : 0
  const max = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 0
  const hasCost = costBasis !== undefined && costBasis > 0 && data.length > 0 && costBasis >= min && costBasis <= max * 1.02
  const yMin = Math.min(min, hasCost ? (costBasis as number) : min)
  const yMax = Math.max(max, hasCost ? (costBasis as number) : max)
  const pad = Math.max((yMax - yMin) * 0.06, 1)
  // split-fill offset: where the cost baseline crosses the gradient
  const split = hasCost && yMax > yMin ? Math.min(1, Math.max(0, (yMax - (costBasis as number)) / (yMax - yMin))) : 1

  const gid = `perf-${idSuffix}`

  return (
    <div className="flex h-full flex-col">
      {showTabs && (
        <div className="mb-2 flex items-center justify-end gap-0.5 self-end rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                'relative rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors',
                activeRange === r.key ? 'text-cyan' : 'text-dim hover:text-light',
              )}
            >
              {activeRange === r.key && (
                <motion.span
                  layoutId={`range-thumb-${idSuffix}`}
                  className="absolute inset-0 rounded-lg border border-cyan/30 bg-cyan/10"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{r.label}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ height }} className="min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 2, bottom: 0, left: 2 }}>
            <defs>
              <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
                {hasCost ? (
                  <>
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
                    <stop offset={`${split * 100}%`} stopColor="#22d3ee" stopOpacity="0.05" />
                    <stop offset={`${Math.min(100, split * 100 + 0.5)}%`} stopColor="#f24822" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#f24822" stopOpacity="0" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </>
                )}
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(226,232,240,0.06)" />
            <XAxis
              dataKey="i"
              tickFormatter={(i: number) => fmtTick(dates[i] ?? new Date())}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              dy={6}
              minTickGap={42}
              interval="preserveStartEnd"
            />
            <YAxis
              orientation={yOrientation}
              domain={[yMin - pad, yMax + pad]}
              tickFormatter={(v: number) => fmtCompact(v)}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickCount={4}
            />
            <Tooltip
              content={<PerfTooltip dates={dates} data={data} />}
              cursor={{ stroke: 'rgba(226,232,240,0.15)', strokeDasharray: '3 3' }}
              isAnimationActive={false}
            />
            {hasCost && (
              <ReferenceLine
                y={costBasis}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="4 4"
                label={{
                  value: 'cost basis',
                  position: yOrientation === 'right' ? 'insideBottomLeft' : 'insideBottomRight',
                  fill: '#94a3b8',
                  fontSize: 9,
                  letterSpacing: 1.2,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke="#22d3ee"
              strokeWidth={2}
              fill={`url(#${gid}-fill)`}
              animationDuration={600}
              animationEasing="ease-out"
              dot={(props: { cx?: number; cy?: number; index?: number }) => {
                if (props.index !== data.length - 1 || props.cx === undefined || props.cy === undefined) {
                  return <g key={`dot-${props.index}`} />
                }
                return (
                  <g key={`dot-end-${data.length}`}>
                    <circle cx={props.cx} cy={props.cy} r={7} fill="#22d3ee" opacity={0.18} />
                    <circle cx={props.cx} cy={props.cy} r={3} fill="#22d3ee" />
                  </g>
                )
              }}
              activeDot={{ r: 3.5, fill: '#22d3ee', stroke: '#0a1628', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* Custom tooltip — design.md §6.7 + Δ vs previous point (investments.md §3). */
function PerfTooltip({
  active,
  payload,
  dates,
  data,
}: {
  active?: boolean
  payload?: { payload?: Point }[]
  dates: Date[]
  data: Point[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]?.payload
  if (!p) return null
  const prev = p.i > 0 ? data[p.i - 1]?.value : undefined
  const delta = prev !== undefined ? p.value - prev : 0
  const pct = prev !== undefined && prev !== 0 ? delta / prev : 0
  const positive = delta >= 0
  return (
    <div className="rounded-xl border border-white/[0.1] bg-navyLight/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-label mb-1.5">{fullDateLabel(dates[p.i] ?? new Date())}</p>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-cyan" />
        <span className="text-xs text-dim">Value</span>
        <span className="text-data-sm ml-auto pl-4 text-light">{fmt(p.value, 2)}</span>
      </div>
      {prev !== undefined && (
        <div className="mt-1 flex items-center gap-2">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', positive ? 'bg-emerald' : 'bg-crimson')} />
          <span className="text-xs text-dim">Δ prev</span>
          <span className={cn('text-data-sm ml-auto pl-4', positive ? 'text-emerald' : 'text-crimson')}>
            {fmtSigned(delta, 2)} · {positive ? '+' : '−'}
            {Math.abs(pct * 100).toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  )
}
