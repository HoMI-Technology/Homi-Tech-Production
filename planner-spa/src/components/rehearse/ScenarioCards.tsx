import { motion } from 'framer-motion'
import { fmt, TEMP_HEX } from '@/store/budget'
import type { ScenarioOutcome } from '@/lib/rehearsal'
import { cn } from '@/lib/utils'

export const SCENARIO_COLORS: Record<string, string> = {
  'buy-now': '#22d3ee', // cyan
  'wait-12': TEMP_HEX.emerald, // emerald
  'wait-24': TEMP_HEX.amber, // gold
}

/**
 * The three scenario cards — Buy now / Wait 12 / Wait 24 — with the 5-year
 * net position in JetBrains Mono. The model's strongest path gets the
 * emerald ring.
 */
export default function ScenarioCards({
  scenarios,
  bestKey,
}: {
  scenarios: ScenarioOutcome[]
  bestKey: string
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {scenarios.map((s, i) => {
        const color = SCENARIO_COLORS[s.key] ?? '#94a3b8'
        const isBest = s.key === bestKey
        return (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06, ease: 'easeOut' }}
            className={cn(
              'card-chrome relative overflow-hidden p-5',
              isBest && 'border-emerald/40 shadow-glow-emerald',
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full"
              style={{ background: `radial-gradient(circle, ${color}14, transparent 70%)` }}
            />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-label">{s.label}</span>
                {isBest && (
                  <span className="ml-auto rounded-full border border-emerald/30 bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald">
                    Strongest
                  </span>
                )}
              </div>
              <p className="text-kpi mt-3 text-light">{fmt(s.netPositionAt60)}</p>
              <p className="mt-1 text-xs text-dim">net position at month 60</p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
