import { useMemo } from 'react'
import { AlertTriangle, OctagonAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReadinessManual } from '@/store/readiness'
import { useBuildPath } from '@/store/buildpath'
import { PREFLIGHT_LEGAL_SHORT } from '@/lib/path'
import { runPreflight, type PreflightInput } from '@/lib/path-preflight'

/**
 * "60-second pre-flight" — canon preflight.ts as a compact card at the top
 * of the path. Renders only when a hard-stop fires or a cash/FOMO check
 * fails (block = crimson, warn = amber). All copy verbatim canon.
 */
export default function PreflightCard() {
  const { assess, finance } = useBuildPath()
  const { manual } = useReadinessManual()

  const preflight = useMemo(() => {
    const input: PreflightInput = {
      assessmentResult: assess,
      monthlyIncome: finance?.monthlyIncome ?? null,
      monthlyExpenses: finance?.monthlyExpenses ?? null,
      monthlyDebtPayments: finance?.monthlyDebtPayments ?? null,
      liquidSavings: finance?.liquidSavings ?? null,
      externalPressure: manual.fomoLevel,
      partnerAlignment: manual.partnerAlignment,
    }
    return runPreflight(input)
  }, [assess, finance, manual.fomoLevel, manual.partnerAlignment])

  const flagged = preflight.findings.filter((f) => f.severity !== 'ok')
  if (flagged.length === 0) return null

  const blocked = preflight.verdict === 'DO_NOT_PROCEED'

  return (
    <div
      className={cn(
        'card-chrome p-5',
        blocked ? 'border-crimson/40 shadow-glow-crimson' : 'border-amber/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl',
              blocked ? 'bg-crimson/15 text-crimson' : 'bg-amber/15 text-amber',
            )}
          >
            {blocked ? <OctagonAlert size={15} /> : <AlertTriangle size={15} />}
          </span>
          <div>
            <p className="text-label">60-second pre-flight</p>
            <p
              className={cn(
                'mt-0.5 font-display text-sm font-semibold tnum',
                blocked ? 'text-crimson' : 'text-amber',
              )}
            >
              {preflight.badge}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        {flagged.map((f, i) => (
          <div key={`${f.signal}-${i}`} className="flex items-start gap-2.5">
            <span
              className={cn(
                'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                f.severity === 'block' ? 'bg-crimson' : 'bg-amber',
              )}
            />
            <div>
              <p className="text-xs font-semibold text-light">{f.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-dim">{f.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-white/[0.06] pt-3 text-[11px] leading-relaxed text-dim/80">
        {preflight.disclaimer} {PREFLIGHT_LEGAL_SHORT}
      </p>
    </div>
  )
}
