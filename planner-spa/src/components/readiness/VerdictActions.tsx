import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { ScoreResult } from '@/lib/score'

type Cta = { label: string; to: string }

const PRIMARY_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#22d3ee] to-[#0ea5c4] px-4 py-2.5 text-sm font-semibold text-[#04121c] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97]'

const SECONDARY_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-[10px] border border-white/[0.12] px-4 py-2.5 text-sm font-semibold text-light transition-colors duration-150 hover:bg-white/[0.04]'

/**
 * Exact verdict → CTA mapping (blueprint Section 05).
 * No lender links, no mortgage ads, no "shop homes" — ever.
 */
function actionsFor(result: ScoreResult): { primary: Cta; secondary?: Cta } {
  switch (result.verdict) {
    case 'READY':
      return {
        primary: { label: 'Open the clarity checklist', to: '/buildpath' },
        secondary: { label: 'Share your report', to: '/report' },
      }
    case 'ALMOST_THERE':
      return {
        primary: { label: 'See your top build modules', to: '/buildpath' },
        secondary: { label: 'Set your re-score date', to: '/buildpath#cadence' },
      }
    case 'BUILD_FIRST':
    case 'NOT_YET':
      return { primary: { label: 'Enter the Build Path', to: '/buildpath' } }
  }
}

/**
 * Verdict → CTA strip (M5) — sits directly under the compass/verdict block.
 * One calm next step per verdict; a hard-stop prepends the dim canon line.
 */
export default function VerdictActions({ result }: { result: ScoreResult }) {
  const { primary, secondary } = actionsFor(result)
  const hardStopActive = result.hardStops.length > 0

  return (
    <div className="card-chrome flex flex-col gap-3 p-5">
      {hardStopActive && (
        <p className="text-xs text-dim">One hard line is crossed. The Build Path starts there.</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link to={primary.to} className={PRIMARY_CLASS}>
          {primary.label}
          <ArrowRight size={15} />
        </Link>
        {secondary && (
          <Link to={secondary.to} className={SECONDARY_CLASS}>
            {secondary.label}
          </Link>
        )}
      </div>
    </div>
  )
}
