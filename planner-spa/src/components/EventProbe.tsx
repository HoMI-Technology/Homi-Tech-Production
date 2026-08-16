import { useEffect, useRef } from 'react'
import { useAssessmentResult } from '@/store/readiness'
import { useConfidence } from '@/lib/confidence'
import { getEvents, logEvent } from '@/lib/events'

/**
 * Metrics instrumentation (blueprint M8 / Section 07 — "metrics beyond vanity DAU").
 * Logs score_computed when the verdict band or score meaningfully changes.
 * Local-only: append-only homi-events log, exportable from Trust.
 */
export default function EventProbe() {
  const result = useAssessmentResult()
  const confidence = useConfidence()
  const last = useRef<string>('')

  useEffect(() => {
    const key = `${result.verdict}:${Math.round(result.score)}`
    if (last.current === key) return
    const isFirst = last.current === ''
    last.current = key
    if (isFirst) {
      // Blueprint Section 07 headline metric: time-to-first-verdict activation.
      // Logged once per device (flagged in the events log itself).
      const already = getEvents().some((e) => e.type === 'first_verdict')
      if (!already) {
        logEvent('first_verdict', {
          score: result.score,
          verdict: result.verdict,
          hardStops: result.hardStops,
          confidence: confidence.level,
          msSinceNavigation: Math.round(performance.now()),
        })
      }
      return
    }
    logEvent('score_computed', {
      score: result.score,
      verdict: result.verdict,
      hardStops: result.hardStops,
      confidence: confidence.level,
    })
  }, [result, confidence])

  return null
}
