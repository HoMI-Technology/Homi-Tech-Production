import { useMemo } from 'react'
import { useAssessmentResult, useReadinessManual } from '@/store/readiness'
import { buildTwinLetter, horizonDisplayLabel, horizonFromMonths } from '@/lib/companions'

/**
 * TemporalTwin — "A message from you, {horizon} from today".
 * The canon letter for the current verdict × the user's time-horizon
 * band, written by their future self. Quiet, dim-bordered, Fraunces italic.
 */
export default function TemporalTwin() {
  const result = useAssessmentResult()
  const { manual } = useReadinessManual()

  const letter = useMemo(
    () => buildTwinLetter(result, manual.timeHorizonMonths),
    [result, manual.timeHorizonMonths],
  )
  const horizon = horizonDisplayLabel(horizonFromMonths(manual.timeHorizonMonths))

  return (
    <div className="card-chrome flex flex-col gap-4 border-white/[0.04] bg-navyLight/40 p-5">
      <span className="text-label">A message from you, {horizon} from today</span>

      <p className="font-serif text-base italic text-light/90">{letter.salutation}</p>

      <div className="flex flex-col gap-3">
        {letter.paragraphs.map((paragraph, i) => (
          <p key={i} className="font-serif text-sm italic leading-relaxed text-dim">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  )
}
