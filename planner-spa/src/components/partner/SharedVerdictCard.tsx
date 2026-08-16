import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { VERDICT_META } from '@/lib/score'
import type { VerdictKey } from '@/lib/score'
import { useAssessmentInputs, useAssessmentResult } from '@/store/readiness'

/** Canon verdict colors — same mapping as the Readiness threshold compass. */
const VERDICT_HEX: Record<VerdictKey, string> = {
  READY: '#34d399',
  ALMOST_THERE: '#facc15',
  BUILD_FIRST: '#fab633',
  NOT_YET: '#f24822', // DO NOT PROCEED
}

/**
 * Section 3 — shared verdict card (module spec §3).
 * Reuses the shared result from useAssessmentResult() — solo-redistributed or
 * two-person, whichever mode Readiness is in. No scoring happens here.
 */
export default function SharedVerdictCard() {
  const result = useAssessmentResult()
  const inputs = useAssessmentInputs()
  const solo = inputs.partnerAlignment === null

  const hex = VERDICT_HEX[result.verdict]
  const meta = VERDICT_META[result.verdict]

  return (
    <div className="card-chrome card-hairline-top flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="text-label">The shared verdict</span>
        <span className="text-label !text-[9px]">{solo ? 'Solo' : 'Two-person'}</span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <span className="text-hero-number text-light">{result.score.toFixed(1)}</span>
        <motion.span
          key={result.verdict}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ backgroundColor: `${hex}1a`, color: hex }}
        >
          <span
            className="h-[5px] w-[5px] rounded-full animate-pulse-dot"
            style={{ backgroundColor: hex }}
            aria-hidden
          />
          {meta.label}
        </motion.span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-dim">
        {solo
          ? 'Right now this verdict is solo — the partner points are redistributed to you.'
          : 'This verdict already includes both of you — 35 points of it is how you each feel.'}
      </p>

      <div className="mt-auto pt-4">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Link
            to="/readiness"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan transition-colors hover:text-light"
          >
            See the full math
            <ArrowRight size={13} aria-hidden />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
