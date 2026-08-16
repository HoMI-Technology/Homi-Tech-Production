import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAssessmentResult, useReadinessManual, useScoreHistory } from '@/store/readiness'
import { deriveSignals, storedAssessmentFrom } from '@/lib/signals'
import { TEMP_HEX } from '@/store/budget'
import type { SignalSeverity } from '@/lib/signals'

/** Severity → canon accent (crimson / amber / gold; cyan + emerald for the quiet tiers). */
const SEVERITY_COLOR: Record<SignalSeverity, string> = {
  crimson: '#fb7185',
  amber: '#fbbf24',
  yellow: TEMP_HEX.yellow,
  cyan: '#22d3ee',
  emerald: TEMP_HEX.emerald,
}

const TOP_SIGNALS = 3

/**
 * SignalsCard — "What needs attention". The top proactive signals from
 * the deterministic signals engine (hard-stop, weak pillar, stale data,
 * pressure), each severity-colored with a deep link. Calm empty state.
 */
export default function SignalsCard() {
  const result = useAssessmentResult()
  const { manual } = useReadinessManual()
  const history = useScoreHistory()

  const signals = useMemo(() => {
    const stored = storedAssessmentFrom(
      result,
      { fomoLevel: manual.fomoLevel, timeHorizonMonths: manual.timeHorizonMonths },
      history[history.length - 1]?.at,
    )
    // No daily check-in surface in this app yet — canon accepts an empty list.
    return deriveSignals({ storedAssessment: stored, recentCheckins: [] }).slice(0, TOP_SIGNALS)
  }, [result, manual.fomoLevel, manual.timeHorizonMonths, history])

  return (
    <div className="card-chrome flex flex-col gap-4 p-5">
      <span className="text-label">What needs attention</span>

      {signals.length === 0 ? (
        <p className="text-sm text-dim">Nothing needs attention. Keep your cadence.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {signals.map((signal) => {
            const color = SEVERITY_COLOR[signal.severity]
            return (
              <li key={signal.id} className="border-l-2 pl-3" style={{ borderColor: color }}>
                <p className="text-sm font-semibold" style={{ color }}>
                  {signal.title}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-light/80">{signal.body}</p>
                <Link
                  to={signal.actionHref}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
                >
                  {signal.actionLabel}
                  <ArrowRight size={12} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
