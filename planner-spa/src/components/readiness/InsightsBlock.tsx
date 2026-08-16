import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAssessmentInputs, useAssessmentResult } from '@/store/readiness'
import { generateKeyInsight, generateNextSteps } from '@/lib/insights'

/**
 * InsightsBlock — one key-insight paragraph + up to 5 next steps,
 * each linking into the Build Path. Copy verbatim from canon
 * lib/scoring/insights.ts via @/lib/insights.
 */
export default function InsightsBlock() {
  const result = useAssessmentResult()
  const inputs = useAssessmentInputs()

  const insight = useMemo(() => generateKeyInsight(result), [result])
  const steps = useMemo(
    () => generateNextSteps(result, { singleRedistribution: inputs.partnerAlignment === null }),
    [result, inputs.partnerAlignment],
  )

  return (
    <div className="card-chrome flex flex-col gap-4 p-5">
      <span className="text-label">The key insight</span>

      <p className="text-sm leading-relaxed text-light/90">{insight}</p>

      <div className="flex flex-col gap-1 border-t border-white/[0.06] pt-3">
        <span className="text-label !text-[9px]">Next steps</span>
        <ul className="mt-2 flex flex-col gap-2">
          {steps.map((step, i) => (
            <li key={i}>
              <Link
                to="/buildpath"
                className="group flex items-start gap-2 text-sm leading-snug text-light/85 transition-colors hover:text-cyan-200"
              >
                <ArrowRight
                  size={14}
                  className="mt-0.5 shrink-0 text-emerald transition-transform duration-150 group-hover:translate-x-0.5"
                />
                <span>{step}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
