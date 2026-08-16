import { motion } from 'framer-motion'
import type { LeverScenario } from '@/lib/scoreSimulator'
import { cn } from '@/lib/utils'

const fmtDelta = (d: number) => `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)}`

/**
 * Money levers — the canonical financial-pillar moves, ranked by score
 * impact. Mono delta, lever name, thin bar. Financial pillar only; the
 * other two pillars are held at the current assessment (stated below).
 */
export default function MoneyLevers({ scenarios }: { scenarios: LeverScenario[] }) {
  // Zero-delta rows are noise — the engine's band thresholds mean a move
  // either crosses a band or it doesn't. Show only what actually moves.
  const moved = scenarios.filter((s) => s.delta !== 0)
  const maxAbs = Math.max(1, ...moved.map((s) => Math.abs(s.delta)))

  if (moved.length === 0) {
    return (
      <p className="text-sm text-dim">
        No money lever moves your score from here — your Financial Reality pillar is already earning
        every point these levers can reach. The remaining points live in Emotional Truth and Perfect
        Timing.
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {moved.map((s, i) => {
        const up = s.delta > 0
        return (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: 'easeOut' }}
            className="flex items-center gap-4 border-b border-white/[0.05] py-3.5 last:border-b-0"
          >
            <span
              className={cn(
                'text-data-sm w-12 shrink-0 text-right font-semibold',
                up ? 'text-emerald' : s.delta < 0 ? 'text-crimson' : 'text-dim',
              )}
            >
              {fmtDelta(s.delta)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-light">
                {s.description} <span className="text-dim">moves your score</span>
              </p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(Math.abs(s.delta) / maxAbs) * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.15 + i * 0.05, ease: 'easeOut' }}
                  className={cn('h-full rounded-full', up ? 'bg-emerald' : s.delta < 0 ? 'bg-crimson' : 'bg-dim')}
                />
              </div>
            </div>
            <span className="hidden shrink-0 text-[11px] uppercase tracking-[0.08em] text-dim/70 sm:block">
              {s.label}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
