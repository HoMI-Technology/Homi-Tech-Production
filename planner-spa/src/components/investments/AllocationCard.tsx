import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { Holding } from '@/store/budget'
import { fmt, fmtPct } from '@/store/budget'
import ChartTooltip from '@/components/ChartTooltip'
import { assetClass, tickerColor } from './investUtils'
import { cn } from '@/lib/utils'

/** Allocation donut + auto-insight panel — investments.md §4. */
export default function AllocationCard({ holdings }: { holdings: Holding[] }) {
  const [active, setActive] = useState<number | null>(null)

  const rows = useMemo(() => {
    const total = holdings.reduce((s, h) => s + h.shares * h.price, 0)
    return holdings
      .map((h, i) => {
        const value = h.shares * h.price
        return { holding: h, value, share: total > 0 ? value / total : 0, color: tickerColor(h.ticker, i) }
      })
      .sort((a, b) => b.value - a.value)
  }, [holdings])

  const top = rows[0]
  const insight = useMemo(() => buildInsight(rows), [rows])

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.12 }}
      className="card-chrome col-span-12 flex flex-col p-5 lg:col-span-4"
    >
      <h2 className="text-h2">Allocation</h2>

      {/* donut with center label */}
      <div className="relative mx-auto mt-2 h-[190px] w-full max-w-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip format={(n) => fmt(n, 2)} />} isAnimationActive={false} />
            <Pie
              data={rows}
              dataKey="value"
              nameKey="holding.ticker"
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={2}
              strokeWidth={0}
              animationDuration={600}
              animationEasing="ease-out"
              onMouseLeave={() => setActive(null)}
            >
              {rows.map((r, i) => (
                <Cell
                  key={r.holding.id}
                  fill={r.color}
                  opacity={active === null || active === i ? 1 : 0.35}
                  onMouseEnter={() => setActive(i)}
                  style={{ transition: 'opacity 150ms', cursor: 'pointer' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {top && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-kpi !text-[24px] text-light">{fmtPct(top.share, 0)}</span>
            <span className="text-label mt-1 !text-[9px]">Top holding · {top.holding.ticker}</span>
          </div>
        )}
      </div>

      {/* legend */}
      <div className="mt-3 flex flex-col gap-1">
        {rows.map((r, i) => (
          <button
            key={r.holding.id}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className={cn(
              'group rounded-lg px-2 py-1.5 text-left transition-all duration-150 hover:bg-white/[0.03]',
              active !== null && active !== i && 'opacity-40',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
              <span className="text-sm font-semibold text-light">{r.holding.ticker}</span>
              <span className="truncate text-xs text-dim">{r.holding.name}</span>
              <span className="text-data-sm ml-auto text-light">{fmtPct(r.share)}</span>
            </div>
            <div className="ml-4 mt-1 h-[2px] overflow-hidden rounded-full bg-white/[0.05]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${r.share * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 + i * 0.05 }}
                className="h-full rounded-full"
                style={{ backgroundColor: r.color }}
              />
            </div>
          </button>
        ))}
      </div>

      {/* auto insight */}
      <div className="mt-auto flex items-start gap-2 border-t border-white/[0.06] pt-3 text-xs leading-relaxed text-dim">
        <Info size={13} className="mt-0.5 shrink-0 text-cyan" />
        <p>{insight}</p>
      </div>
    </motion.section>
  )
}

type Row = { holding: Holding; value: number; share: number; color: string }

/** Auto-generated insight line (equities / crypto / cash-like mix). */
function buildInsight(rows: Row[]): string {
  const total = rows.reduce((s, r) => s + r.value, 0)
  if (total <= 0) return 'Add a position to see your allocation mix.'
  let eq = 0
  let cr = 0
  let ca = 0
  for (const r of rows) {
    const cls = assetClass(r.holding.ticker)
    if (cls === 'crypto') cr += r.value
    else if (cls === 'cash') ca += r.value
    else eq += r.value
  }
  const eqP = Math.round((eq / total) * 100)
  const crP = Math.round((cr / total) * 100)
  const caP = Math.max(0, 100 - eqP - crP)
  let line = `${eqP}% equities · ${crP}% crypto · ${caP}% cash-like.`
  if (cr / total > 0.1) line += ' Crypto above 10% adds volatility to your readiness score.'
  else if (ca / total > 0.35) line += ' A large cash cushion is safe but may lag long-term growth.'
  else if (eq / total >= 0.7) line += ' Equity-heavy mix — expect wider swings month to month.'
  else line += ' Allocation looks balanced across risk levels.'
  return line
}
