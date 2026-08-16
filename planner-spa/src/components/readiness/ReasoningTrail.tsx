import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { PILLARS, PILLAR_MAX_POINTS } from '@/lib/score'
import type { AssessmentInputs, PillarKey, ScoreResult } from '@/lib/score'
import { cn } from '@/lib/utils'
import { fmtPct } from '@/store/budget'
import { useAssessmentInputs, useBudgetDerived } from '@/store/readiness'
import type { BudgetDerived } from '@/store/readiness'

const PILLAR_COLOR: Record<PillarKey, string> = {
  financial: '#22d3ee',
  emotional: '#34d399',
  timing: '#facc15',
}

const PILLAR_ORDER: PillarKey[] = ['financial', 'emotional', 'timing']

const FINITE = (v: number | undefined | null): v is number =>
  typeof v === 'number' && Number.isFinite(v)

const FALLBACK_WHY = 'From your inputs — the published scoring method does the rest.'

/**
 * One-line "why" per sub-factor — names the live input driving the points.
 * Static fallback phrasing whenever a value is unavailable.
 */
function whyLine(factorKey: string, inputs: AssessmentInputs, derived: BudgetDerived): string {
  switch (factorKey) {
    case 'dti': {
      const v = inputs.debtToIncomeRatio
      if (!FINITE(v)) return FALLBACK_WHY
      const pct = fmtPct(v)
      if (v <= 0.28) return `Debt-to-income ${pct} — comfortably inside the 28% line`
      if (v <= 0.36) return `Debt-to-income ${pct} — inside the 36% line, above the 28% mark`
      if (v <= 0.43) return `Debt-to-income ${pct} — under the 43% ceiling, with little margin`
      return `Debt-to-income ${pct} — above the 43% line; this leads the build list`
    }
    case 'downPayment': {
      const v = inputs.downPaymentPercent
      if (!FINITE(v)) return FALLBACK_WHY
      const pct = fmtPct(v)
      if (v >= 0.2) return `Down payment ${pct} — at the 20% mark`
      if (v >= 0.1) return `Down payment ${pct} — past 10%, short of the 20% mark`
      if (v >= 0.05) return `Down payment ${pct} — past 5%; every step here counts`
      return `Down payment ${pct} — under 5%; the goal fund builds this`
    }
    case 'emergencyFund': {
      const v = inputs.emergencyFundMonths
      if (!FINITE(v)) return FALLBACK_WHY
      const mo = `${v.toFixed(1)} months`
      if (v >= 6) return `${mo} of runway — a full cushion`
      if (v >= 3) return `${mo} of runway — solid, short of the six-month mark`
      if (v >= 1) return `${mo} of runway — three months is the next mark`
      return `${mo} of runway — under one month; runway comes first`
    }
    case 'credit': {
      const v = inputs.creditScore
      if (!FINITE(v)) return 'Credit score — self-reported; update it when you check.'
      if (v >= 740) return `Credit ${v} — excellent territory`
      if (v >= 700) return `Credit ${v} — strong standing`
      if (v >= 660) return `Credit ${v} — fair; small gains move this`
      return `Credit ${v} — below 660; credit is a build module`
    }
    case 'lifeStability': {
      const v = inputs.lifeStability
      if (!FINITE(v)) return FALLBACK_WHY
      if (v >= 8) return `Life stability ${v}/10 — a steady base`
      if (v >= 5) return `Life stability ${v}/10 — mostly steady`
      return `Life stability ${v}/10 — in flux; steadiness earns points here`
    }
    case 'confidence': {
      const v = inputs.confidenceLevel
      if (!FINITE(v)) return FALLBACK_WHY
      if (v >= 8) return `Confidence ${v}/10 — you trust your read`
      if (v >= 5) return `Confidence ${v}/10 — growing certainty`
      return `Confidence ${v}/10 — unsure; clarity work helps here`
    }
    case 'partnerAlignment': {
      const v = inputs.partnerAlignment
      if (v === null) return 'Solo — partner points redistributed across the other three'
      if (!FINITE(v)) return FALLBACK_WHY
      if (v >= 8) return `Partner alignment ${v}/10 — pulling together`
      if (v >= 5) return `Partner alignment ${v}/10 — mostly aligned`
      return `Partner alignment ${v}/10 — alignment talks earn points here`
    }
    case 'fomo': {
      const v = inputs.fomoLevel
      if (!FINITE(v)) return FALLBACK_WHY
      if (v <= 3) return `FOMO ${v}/10 — low outside noise`
      if (v <= 6) return `FOMO ${v}/10 — some outside noise`
      return `FOMO ${v}/10 — high outside pressure; it costs points here`
    }
    case 'timeHorizon': {
      const v = inputs.timeHorizonMonths
      if (!FINITE(v)) return FALLBACK_WHY
      if (v > 12) return `${v} months out — plenty of room to prepare`
      if (v >= 6) return `${v} months out — a workable window`
      if (v >= 3) return `${v} months out — tight; time is a factor`
      return `${v} months out — very tight; rushing is the risk`
    }
    case 'savingsRate': {
      const v = inputs.savingsRate
      if (!FINITE(v)) return FALLBACK_WHY
      const pct = fmtPct(v)
      if (v >= 0.2) return `Savings rate ${pct} — a strong pace`
      if (v >= 0.1) return `Savings rate ${pct} — a steady pace`
      if (v >= 0) return `Savings rate ${pct} — positive, with room to grow`
      return `Savings rate ${pct} — negative; outflow exceeds inflow`
    }
    case 'downPaymentProgress': {
      if (!derived.hasHouseGoal) return 'No down-payment goal set — set one to measure progress'
      const v = inputs.downPaymentProgress
      if (!FINITE(v)) return FALLBACK_WHY
      const pct = fmtPct(v)
      if (v >= 0.8) return `${pct} of your goal saved — nearly there`
      if (v >= 0.5) return `${pct} of your goal saved — past halfway`
      if (v >= 0.25) return `${pct} of your goal saved — building steadily`
      return `${pct} of your goal saved — early days; contributions compound`
    }
    default:
      return FALLBACK_WHY
  }
}

/**
 * ReasoningTrail — "The math" explainability panel (M1).
 * One section per pillar: question header, total X / max, and a row per
 * sub-factor with points, a thin bar, and a one-line "why" that names the
 * live input driving it. Collapsed by default behind "See the math".
 */
export default function ReasoningTrail({ result }: { result: ScoreResult }) {
  const [showMath, setShowMath] = useState(false)
  const inputs = useAssessmentInputs()
  const derived = useBudgetDerived()

  return (
    <div className="card-chrome flex flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="text-label">The math</span>
        <span className="text-label !text-[9px]">Explainability</span>
      </div>

      <button
        type="button"
        onClick={() => setShowMath((v) => !v)}
        className="mt-4 flex w-fit items-center gap-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
        aria-expanded={showMath}
      >
        <ChevronDown
          size={14}
          className={cn('transition-transform duration-200', showMath && 'rotate-180')}
        />
        {showMath ? 'Hide the math' : 'See the math'}
      </button>

      <AnimatePresence initial={false}>
        {showMath && (
          <motion.div
            key="reasoning-trail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-col gap-6 border-t border-white/[0.06] pt-4">
              {PILLAR_ORDER.map((key) => {
                const pillar = result.pillars[key]
                const color = PILLAR_COLOR[key]
                return (
                  <div key={key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold" style={{ color }}>
                          {PILLARS[key].label}
                        </p>
                        <p className="mt-0.5 text-xs text-dim">{PILLARS[key].question}</p>
                        {key === 'emotional' && (
                          <p className="mt-1 font-serif text-[13px] italic text-dim">
                            How you feel is data. We weigh it equally —{' '}
                            {PILLAR_MAX_POINTS.emotional} of 100.
                          </p>
                        )}
                      </div>
                      <span className="text-data-sm shrink-0 text-light">
                        {pillar.total} / {pillar.max}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-col gap-3.5">
                      {pillar.factors.map((f) => {
                        // Clamp: solo redistribution can push pts past nominal max (canon-intentional)
                        const frac = f.max > 0 ? Math.min(1, f.pts / f.max) : 0
                        return (
                          <div key={f.key}>
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="truncate text-xs font-medium text-light/90">
                                {f.label}
                              </span>
                              <span className="text-data-sm shrink-0 !text-[11px] text-dim">
                                {f.pts} / {f.max}
                              </span>
                            </div>
                            <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${frac * 100}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                            <p className="mt-1 text-[11px] leading-snug text-dim">
                              {whyLine(f.key, inputs, derived)}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              <p className="border-t border-white/[0.06] pt-3 text-xs text-dim">
                Every point above comes from the same published scoring method — no hidden
                adjustments.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
