import { motion } from 'framer-motion'
import AnimatedNumber from '@/components/AnimatedNumber'
import { PILLARS } from '@/lib/score'
import type { PillarKey, ScoreResult } from '@/lib/score'

const PILLAR_COLOR: Record<PillarKey, string> = {
  financial: '#22d3ee',
  emotional: '#34d399',
  timing: '#facc15',
}

const PILLAR_ORDER: PillarKey[] = ['financial', 'emotional', 'timing']

/**
 * Pillar breakdown card — three animated pillar bars (design/readiness.md §2
 * right card). The "See the math" sub-factor disclosure lives in
 * ReasoningTrail, directly below this card on the Readiness page.
 */
export default function PillarBreakdown({ result }: { result: ScoreResult }) {
  return (
    <div className="card-chrome flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="text-label">Pillar Breakdown</span>
        <span className="text-label !text-[9px]">Points earned</span>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        {PILLAR_ORDER.map((key, i) => {
          const pillar = result.pillars[key]
          const color = PILLAR_COLOR[key]
          const frac = pillar.max > 0 ? pillar.total / pillar.max : 0
          return (
            <div key={key}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-light">{PILLARS[key].label}</p>
                  <p className="mt-0.5 truncate text-xs text-dim">{PILLARS[key].question}</p>
                </div>
                <AnimatedNumber
                  value={pillar.total}
                  format={(n) => `${Math.round(n)} / ${pillar.max}`}
                  className="text-data-sm shrink-0 text-light"
                />
              </div>
              <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${frac * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 26, delay: 0.1 + i * 0.06 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}66` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
