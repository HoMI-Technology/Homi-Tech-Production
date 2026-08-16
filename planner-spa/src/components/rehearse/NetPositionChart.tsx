import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartTooltip from '@/components/ChartTooltip'
import { fmtCompact } from '@/store/budget'
import type { ScenarioOutcome } from '@/lib/rehearsal'
import { SCENARIO_COLORS } from './ScenarioCards'

type Row = { month: number } & Record<string, number>

/**
 * The three net-position curves (buy-now cyan / wait-12 emerald /
 * wait-24 gold), month 0 → 60.
 */
export default function NetPositionChart({ scenarios }: { scenarios: ScenarioOutcome[] }) {
  const data: Row[] = useMemo(() => {
    const rows: Row[] = []
    const months = scenarios[0]?.series.length ?? 0
    for (let i = 0; i < months; i++) {
      const row: Row = { month: i }
      for (const s of scenarios) row[s.key] = s.series[i]?.netPosition ?? 0
      rows.push(row)
    }
    return rows
  }, [scenarios])

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {scenarios.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-dim">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SCENARIO_COLORS[s.key] }} />
            {s.label}
          </span>
        ))}
      </div>
      <div style={{ height: 300 }} className="min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 2 }}>
            <CartesianGrid vertical={false} stroke="rgba(226,232,240,0.06)" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              dy={6}
              ticks={[0, 12, 24, 36, 48, 60]}
              tickFormatter={(m: number) => (m === 0 ? 'Today' : `Mo ${m}`)}
            />
            <YAxis
              orientation="right"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fmtCompact(v)}
              width={48}
            />
            <Tooltip
              content={<ChartTooltip format={(n) => fmtCompact(n)} />}
              cursor={{ stroke: 'rgba(226,232,240,0.15)' }}
              labelFormatter={(m) => `Month ${m}`}
            />
            <ReferenceLine y={0} stroke="rgba(226,232,240,0.18)" strokeDasharray="3 3" />
            {scenarios.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={SCENARIO_COLORS[s.key]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
