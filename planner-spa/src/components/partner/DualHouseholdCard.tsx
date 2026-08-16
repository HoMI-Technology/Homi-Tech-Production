import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { computeScore, HARD_STOP_MESSAGES, VERDICT_META } from '@/lib/score'
import type { AssessmentInputs } from '@/lib/score'
import { computeDualHouseholdScore } from '@/lib/household'
import type { DualHouseholdScore } from '@/lib/household'
import { useAssessmentInputs, useAssessmentResult } from '@/store/readiness'
import { usePartner } from '@/store/partner'
import { TEMP_HEX } from '@/store/budget'
import { VERDICT_HEX } from '@/components/readiness/ThresholdCompass'

const CYAN = '#22d3ee' // You
const EMERALD = TEMP_HEX.emerald // Partner
const GOLD = TEMP_HEX.yellow // Joint

/**
 * The partner's standalone read: shared budget-derived financial inputs plus
 * the partner's own emotional/timing answers from the partner store. The
 * partner never answers an alignment question, so partnerAlignment is null
 * and the engine's canonical solo redistribution applies to their read.
 */
function usePartnerResult() {
  const inputs = useAssessmentInputs()
  const { partnerInputs } = usePartner()
  return useMemo(() => {
    const partnerAssessment: AssessmentInputs = {
      debtToIncomeRatio: inputs.debtToIncomeRatio,
      downPaymentPercent: inputs.downPaymentPercent,
      emergencyFundMonths: inputs.emergencyFundMonths,
      creditScore: partnerInputs.creditScore,
      lifeStability: partnerInputs.lifeStability,
      confidenceLevel: partnerInputs.confidenceLevel,
      partnerAlignment: null,
      fomoLevel: partnerInputs.fomoLevel,
      timeHorizonMonths: partnerInputs.timeHorizonMonths,
      savingsRate: inputs.savingsRate,
      downPaymentProgress: inputs.downPaymentProgress,
    }
    return computeScore(partnerAssessment)
  }, [inputs, partnerInputs])
}

function MemberScore({
  label,
  score,
  verdict,
  color,
}: {
  label: string
  score: number
  verdict: keyof typeof VERDICT_META
  color: string
}) {
  const hex = VERDICT_HEX[verdict]
  return (
    <div>
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        {label}
      </span>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-hero-number text-light">{score.toFixed(1)}</span>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ backgroundColor: `${hex}1a`, color: hex }}
        >
          {VERDICT_META[verdict].label}
        </span>
      </div>
    </div>
  )
}

function DualView({ dual }: { dual: DualHouseholdScore }) {
  const jointHex = VERDICT_HEX[dual.jointVerdict]

  return (
    <>
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <MemberScore
          label={dual.memberA.label}
          score={dual.memberA.score}
          verdict={dual.memberA.verdict}
          color={CYAN}
        />
        <MemberScore
          label={dual.memberB.label}
          score={dual.memberB.score}
          verdict={dual.memberB.verdict}
          color={EMERALD}
        />
      </div>

      {/* joint score — min of the two, gold */}
      <div className="mt-5 border-t border-white/[0.06] pt-5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: GOLD }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} aria-hidden />
          Joint score
        </span>
        <div className="mt-1.5 flex items-baseline gap-2">
          <motion.span
            key={dual.jointScore}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-hero-number text-light"
          >
            {dual.jointScore.toFixed(1)}
          </motion.span>
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{ backgroundColor: `${jointHex}1a`, color: jointHex }}
          >
            {VERDICT_META[dual.jointVerdict].label}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-dim">
          A household moves at the speed of its slower readiness.
        </p>
      </div>

      {/* hard-stop union banner */}
      {dual.jointHardStops.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl border p-4"
          style={{ borderColor: `${VERDICT_HEX.NOT_YET}55`, backgroundColor: `${VERDICT_HEX.NOT_YET}14` }}
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: VERDICT_HEX.NOT_YET }}
          >
            Protective hard-stop — household
          </span>
          <ul className="mt-2 flex flex-col gap-2">
            {dual.jointHardStops.map((key) => (
              <li key={key} className="flex gap-2 text-xs leading-relaxed text-light">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: VERDICT_HEX.NOT_YET }}
                  aria-hidden
                />
                {HARD_STOP_MESSAGES[key]}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* gap narrative (canon summary copy) */}
      <p className="mt-4 flex items-start gap-2 text-xs font-medium leading-relaxed" style={{ color: GOLD }}>
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: GOLD }} aria-hidden />
        {dual.summary}
      </p>

      <p className="mt-auto pt-4 text-[10px] leading-relaxed text-dim/70">{dual.disclaimer}</p>
    </>
  )
}

/**
 * Two full reads — the canonical dual-household view (household/dual-score.ts).
 * Your score (cyan) · partner score (emerald) · joint score (gold = min),
 * hard-stop union, and the gap narrative. Solo mode shows a dignified empty
 * state inviting a second read.
 */
export default function DualHouseholdCard() {
  const inputs = useAssessmentInputs()
  const yourResult = useAssessmentResult()
  const partnerResult = usePartnerResult()
  const solo = inputs.partnerAlignment === null

  const dual = useMemo(
    () =>
      computeDualHouseholdScore(
        { label: 'You', result: yourResult },
        { label: 'Partner', result: partnerResult },
      ),
    [yourResult, partnerResult],
  )

  return (
    <div className="card-chrome card-hairline-top flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="text-label">Two full reads</span>
        <span className="text-label !text-[9px]">{solo ? 'One read so far' : 'Household view'}</span>
      </div>

      {solo ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <p className="max-w-sm font-serif text-lg italic text-dim">
            There is one read on this decision right now — yours. It is honest and it counts.
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-dim">
            If someone else will share the keys, switch off solo in Readiness and add their read
            here. A household moves at the speed of its slower readiness — and that only shows
            when both reads are on the table.
          </p>
        </div>
      ) : (
        <DualView dual={dual} />
      )}
    </div>
  )
}
