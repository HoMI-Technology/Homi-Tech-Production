import { motion } from 'framer-motion'
import { DIMENSIONS, GENOME_DIMENSIONS, scoreGenome } from '@/lib/genome'
import type { GenomeAnswers } from '@/lib/genome'

/**
 * Genome results — 9 dimension bars (0–100, mono values, pillar-colored
 * rotation). Each bar carries the canon's description, the meaning at your
 * end of the scale, and what the pattern can mean for a home decision.
 * Descriptive, never prescriptive — no verdicts here.
 */
export default function GenomeResults({ answers }: { answers: GenomeAnswers }) {
  const scores = scoreGenome(answers)

  return (
    <div className="flex flex-col gap-4">
      {DIMENSIONS.map((dim, i) => {
        const meta = GENOME_DIMENSIONS[i]
        const score = scores.find((s) => s.key === dim.key)?.score ?? 0
        const meaning = score >= 50 ? dim.highMeaning : dim.lowMeaning
        const fillPct = Math.max(2, score)

        return (
          <motion.div
            key={dim.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: 'easeOut' }}
            className="card-chrome p-5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-light">
                <span
                  className="mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle"
                  style={{ backgroundColor: meta.color }}
                  aria-hidden
                />
                {dim.name}
              </span>
              <span className="text-data-sm text-light">
                {score} <span className="text-dim">/ 100</span>
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: meta.color }}
                initial={{ width: 0 }}
                animate={{ width: `${fillPct}%` }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.05, ease: 'easeOut' }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[9px] font-medium uppercase tracking-wider text-dim/60">
              <span>0</span>
              <span>100</span>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-dim">{dim.description}</p>
            <p className="mt-2 text-xs leading-relaxed text-light">{meaning}</p>
            <p className="mt-2 border-t border-white/[0.06] pt-2 text-[11px] leading-relaxed text-dim/80">
              <span className="font-semibold uppercase tracking-[0.1em]" style={{ color: meta.color }}>
                For a home decision ·{' '}
              </span>
              {dim.skew}
            </p>
          </motion.div>
        )
      })}
    </div>
  )
}
