import { motion } from 'framer-motion'
import { sliderToPoints } from '@/lib/score'
import { useAssessmentInputs, useAssessmentResult } from '@/store/readiness'

const CYAN = '#22d3ee' // You
const EMERALD = '#34d399' // Partner
const GOLD = '#facc15' // shared / gap

type DiffRow = {
  /** Canon factor group this comparison belongs to. */
  group: string
  youLabel: string
  partnerLabel: string
  youPts: number
  partnerPts: number
  youMax: number
  partnerMax: number
}

function FactorBar({
  label,
  person,
  pts,
  max,
  color,
}: {
  label: string
  person: string
  pts: number
  max: number
  color: string
}) {
  const pct = max > 0 ? (pts / max) * 100 : 0
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-dim">
          <span className="font-semibold" style={{ color }}>
            {person}
          </span>
          {' · '}
          {label}
        </span>
        <span className="text-data-sm text-light">
          {pts} <span className="text-dim">/ {max}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

/**
 * Section 2 — pillar diff (module spec §2, M7).
 * Compares the two emotional-truth readings side by side. All point math goes
 * through sliderToPoints from @/lib/score; factor maxes come from the engine's
 * own pillar breakdown — nothing is recomputed or hard-coded here.
 */
export default function PillarDiff() {
  const inputs = useAssessmentInputs()
  const result = useAssessmentResult()
  const partnerAlignment = inputs.partnerAlignment
  const solo = partnerAlignment === null

  const emotionalFactors = result.pillars.emotional.factors
  const confidenceMax = emotionalFactors.find((f) => f.key === 'confidence')?.max ?? 0
  const partnerMax = emotionalFactors.find((f) => f.key === 'partnerAlignment')?.max ?? 0

  const rows: DiffRow[] = []
  if (partnerAlignment !== null && confidenceMax > 0 && partnerMax > 0) {
    rows.push({
      group: 'Desire / excitement',
      youLabel: 'Confidence', // engine semantics: your own certainty ("Unsure" → "Certain")
      partnerLabel: 'Partner alignment', // engine semantics: how aligned your partner is
      youPts: sliderToPoints(inputs.confidenceLevel, confidenceMax),
      partnerPts: sliderToPoints(partnerAlignment, partnerMax),
      youMax: confidenceMax,
      partnerMax,
    })
  }

  return (
    <div className="card-chrome flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="text-label">You vs Partner</span>
        <span className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.12em]">
          <span className="flex items-center gap-1.5 text-cyan">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan" aria-hidden />
            You
          </span>
          <span className="flex items-center gap-1.5 text-emerald">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
            Partner
          </span>
        </span>
      </div>

      {solo ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <p className="max-w-sm font-serif text-lg italic text-dim">
            You&rsquo;re scoring solo right now. If someone else is part of this decision, their
            reading matters as much as yours.
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-6">
          {rows.map((row) => {
            const gap = Math.abs(row.youPts - row.partnerPts)
            return (
              <div key={row.group}>
                <span className="text-label !text-[9px]">{row.group}</span>
                <div className="mt-3 flex flex-col gap-4">
                  <FactorBar
                    label={row.youLabel}
                    person="You"
                    pts={row.youPts}
                    max={row.youMax}
                    color={CYAN}
                  />
                  <FactorBar
                    label={row.partnerLabel}
                    person="Partner"
                    pts={row.partnerPts}
                    max={row.partnerMax}
                    color={EMERALD}
                  />
                </div>
                {gap >= 3 && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center gap-2 text-xs font-medium"
                    style={{ color: GOLD }}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: GOLD }}
                      aria-hidden
                    />
                    A gap of {gap} points — worth a conversation, not an argument.
                  </motion.p>
                )}
              </div>
            )
          })}

          <p className="border-t border-white/[0.06] pt-4 text-[11px] leading-relaxed text-dim/80">
            Both readings come from the sliders in Readiness — yours and your partner&rsquo;s.
            Neither one outranks the other.
          </p>
        </div>
      )}
    </div>
  )
}
