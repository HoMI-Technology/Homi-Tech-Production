import { useMemo } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useReadinessManual } from '@/store/readiness'
import { deriveConflictSignals } from '@/lib/conflict'

/**
 * ConflictNotice — the conflict/bias layer (never affects the score).
 * When herd pressure or manufactured urgency shows up in the user's own
 * FOMO/horizon inputs, surface one calm amber notice. Never accusatory.
 */
export default function ConflictNotice() {
  const { manual } = useReadinessManual()

  const signals = useMemo(
    () =>
      deriveConflictSignals({
        fomoLevel: manual.fomoLevel,
        timeHorizonMonths: manual.timeHorizonMonths,
      }),
    [manual.fomoLevel, manual.timeHorizonMonths],
  )

  if (signals.length === 0) return null

  return (
    <div className="card-chrome flex flex-col gap-3 border-l-2 border-l-[#fbbf24] p-5">
      <div className="flex items-center gap-2">
        <ShieldAlert size={15} className="text-[#fbbf24]" />
        <span className="text-sm font-semibold text-[#fbbf24]">
          Outside pressure detected — the math doesn't hurry.
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {signals.map((signal) => (
          <li key={signal.code} className="text-[13px] leading-snug text-light/80">
            <span className="font-medium text-light/90">{signal.title}.</span> {signal.message}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-dim">
        This never changes your score. It only names the pressure, so it stays yours to weigh.
      </p>
    </div>
  )
}
