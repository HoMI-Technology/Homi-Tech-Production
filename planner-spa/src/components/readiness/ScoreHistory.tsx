import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AnimatedNumber from '@/components/AnimatedNumber'
import { VERDICT_META } from '@/lib/score'
import { useScoreHistory } from '@/store/readiness'
import type { ScoreSnapshot } from '@/store/readiness'
import { VERDICT_HEX } from '@/components/readiness/ThresholdCompass'

const CYAN = '#22d3ee'

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type SparkPoint = { at: string; score: number; verdict: ScoreSnapshot['verdict'] }

/** Custom dark tooltip: score + verdict label + date. */
function HistoryTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload?: SparkPoint }[]
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  const hex = VERDICT_HEX[point.verdict]
  return (
    <div className="rounded-xl border border-white/[0.1] bg-navyLight/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-label mb-1">{shortDate(point.at)}</p>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
        <span className="text-xs text-dim">{VERDICT_META[point.verdict].label}</span>
        <span className="text-data-sm ml-auto pl-4 text-light">{point.score.toFixed(1)}</span>
      </div>
    </div>
  )
}

/**
 * Versioned re-checks (M1/M8) — cyan sparkline of the HōMI-Score over time
 * plus a "Re-checks" rail with the five most recent snapshots.
 */
export default function ScoreHistory() {
  const history = useScoreHistory()

  return (
    <div className="card-chrome flex flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="text-label">Score history</span>
        {history.length > 0 && (
          <span className="flex items-center rounded-full bg-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
            <AnimatedNumber
              value={history.length}
              format={(n) => `Re-check #${Math.max(1, Math.round(n))}`}
            />
          </span>
        )}
      </div>

      {history.length < 2 ? (
        <div className="mt-4 flex flex-col items-center py-4 text-center">
          <p className="max-w-xs font-serif text-[15px] italic leading-relaxed text-dim">
            Your first bearing is set. Come back when something changes — a re-check shows
            your direction.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-stretch">
          {/* sparkline — 56px tall, cyan stroke, one dot per re-check */}
          <div className="min-w-0 flex-1">
            <ResponsiveContainer width="100%" height={56}>
              <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="score-history-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CYAN} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="at" hide />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                <Tooltip
                  content={<HistoryTooltip />}
                  cursor={{ stroke: 'rgba(226,232,240,0.15)', strokeWidth: 1 }}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={CYAN}
                  strokeWidth={1.5}
                  fill="url(#score-history-fill)"
                  dot={{ r: 2.5, fill: CYAN, strokeWidth: 0 }}
                  activeDot={{ r: 3.5, fill: CYAN, strokeWidth: 0 }}
                  animationDuration={600}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* re-checks rail — five most recent, newest first */}
          <div className="flex shrink-0 flex-col gap-1.5 border-t border-white/[0.06] pt-3 sm:w-48 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <span className="text-label !text-[9px]">Re-checks</span>
            {history
              .slice(-5)
              .reverse()
              .map((snap) => (
                <div key={snap.at} className="flex items-baseline gap-1.5 text-[11px]">
                  <span className="shrink-0 text-dim">{shortDate(snap.at)}</span>
                  <span className="text-dim/60">·</span>
                  <span className="text-data-sm !text-[11px] text-light">
                    {snap.score.toFixed(1)}
                  </span>
                  <span className="text-dim/60">·</span>
                  <span
                    className="truncate font-semibold uppercase tracking-wide"
                    style={{ color: VERDICT_HEX[snap.verdict] }}
                  >
                    {VERDICT_META[snap.verdict].label}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
