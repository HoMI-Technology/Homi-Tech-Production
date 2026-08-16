import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ThresholdCompass from '@/components/readiness/ThresholdCompass'
import PillarBreakdown from '@/components/readiness/PillarBreakdown'
import ReasoningTrail from '@/components/readiness/ReasoningTrail'
import ScoreHistory from '@/components/readiness/ScoreHistory'
import VerdictActions from '@/components/readiness/VerdictActions'
import { HardStopBanner, WarningsBanner } from '@/components/readiness/Banners'
import BudgetInputsCard from '@/components/readiness/BudgetInputsCard'
import ManualInputsCard from '@/components/readiness/ManualInputsCard'
import TrinityDebate from '@/components/readiness/TrinityDebate'
import TemporalTwin from '@/components/readiness/TemporalTwin'
import InsightsBlock from '@/components/readiness/InsightsBlock'
import SignalsCard from '@/components/readiness/SignalsCard'
import ConflictNotice from '@/components/readiness/ConflictNotice'
import { useAssessmentResult } from '@/store/readiness'

const reveal = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.06, ease: 'easeOut' as const },
})

/**
 * Readiness view — design/readiness.md.
 * The HōMI-Score: Financial Reality, Emotional Truth, Perfect Timing.
 */
export default function Readiness() {
  const result = useAssessmentResult()

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* hero row: compass + verdict CTAs + score history (7) · pillars + the math (5) */}
      <motion.div {...reveal(0)} className="col-span-12 flex flex-col gap-6 lg:col-span-7">
        <ThresholdCompass result={result} />
        <VerdictActions result={result} />
        {/* full assessment CTA — the deeper read, when you want it */}
        <Link
          to="/assessment"
          className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-emerald to-cyan px-4 py-3 text-sm font-semibold text-[#04121c] transition-transform duration-150 hover:scale-[1.01] active:scale-[0.98]"
        >
          Take the full 45-question assessment
          <ArrowRight size={15} />
        </Link>
        <ScoreHistory />
      </motion.div>
      <motion.div {...reveal(1)} className="col-span-12 flex flex-col gap-6 lg:col-span-5">
        <PillarBreakdown result={result} />
        <ReasoningTrail result={result} />
      </motion.div>

      {/* hard-stops + warnings (full width, conditional) */}
      <motion.div {...reveal(2)} className="col-span-12 flex flex-col gap-4">
        <HardStopBanner result={result} />
        <WarningsBanner result={result} />
      </motion.div>

      {/* inputs row: budget-derived (7) + manual (5) */}
      <motion.div {...reveal(3)} className="col-span-12 lg:col-span-7">
        <BudgetInputsCard result={result} />
      </motion.div>
      <motion.div {...reveal(4)} className="col-span-12 lg:col-span-5">
        <ManualInputsCard />
      </motion.div>

      {/* companion layer: conflict check (conditional, full width) */}
      <motion.div {...reveal(5)} className="col-span-12">
        <ConflictNotice />
      </motion.div>

      {/* companion layer: trinity debate (7) + temporal twin (5) */}
      <motion.div {...reveal(6)} className="col-span-12 lg:col-span-7">
        <TrinityDebate />
      </motion.div>
      <motion.div {...reveal(7)} className="col-span-12 lg:col-span-5">
        <TemporalTwin />
      </motion.div>

      {/* companion layer: key insight + next steps (7) · signals (5) */}
      <motion.div {...reveal(8)} className="col-span-12 lg:col-span-7">
        <InsightsBlock />
      </motion.div>
      <motion.div {...reveal(9)} className="col-span-12 lg:col-span-5">
        <SignalsCard />
      </motion.div>

      {/* footer disclaimer strip — verbatim legal block (required on score surfaces) */}
      <motion.div {...reveal(10)} className="col-span-12">
        <div className="mx-auto max-w-3xl border-t border-white/[0.06] pt-4 text-center text-xs leading-relaxed text-dim/80">
          <p>
            HōMI is a product of HOMI TECHNOLOGIES LLC. HōMI is not a lender, mortgage broker,
            registered investment advisor, credit bureau, real estate agent or brokerage, financial
            planner, bank or deposit institution, or product recommendation engine. HōMI provides
            educational guidance only and does not provide financial, legal, tax, mortgage, real
            estate, or investment advice.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
