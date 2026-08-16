import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check, CheckCircle2, Circle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseStepEvidence, stepWhyLine, type PathStep } from '@/lib/path'

type Props = {
  step: PathStep
  /** Position in the ordered step list (0-based) — mono index number. */
  index: number
  /** Live status from the canon path. */
  done: boolean
  /** Done only because the user marked it (manual evidence). */
  manualDone: boolean
  compact?: boolean
  onMarkDone: (id: string) => void
  onUndoDone: (id: string) => void
  onDismiss: (id: string) => void
}

const SURFACE_LABEL: Record<string, string> = {
  '/goals': 'Open goals',
  '/transactions': 'Open ledger',
  '/readiness': 'Open readiness',
  '/partner': 'Open partner',
}

function ctaLabel(href: string): string {
  return SURFACE_LABEL[href] ?? 'Open'
}

/** Evidence line ("cleared by your ledger Aug 5"), or null when none. */
function evidenceLine(step: PathStep): string | null {
  const ev = parseStepEvidence(step.notes)
  return ev ? ev.detail : null
}

/**
 * One canon Path-to-Ready step: mono index, canon title, verbatim canon
 * why-line, the done-gate (clears when the underlying number clears, with
 * the evidence line once it has), funding target where the engine priced
 * one, and a deep link to the surface that moves the number.
 */
export default function ModuleCard({
  step,
  index,
  done,
  manualDone,
  compact = false,
  onMarkDone,
  onUndoDone,
  onDismiss,
}: Props) {
  const evidence = evidenceLine(step)

  if (compact) {
    /* Done-group row */
    return (
      <div className="flex items-center gap-3 py-2.5">
        <CheckCircle2 size={15} className="shrink-0 text-emerald" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-light">{step.title}</p>
          <p className="truncate text-[11px] text-dim">
            {evidence ?? (step.completedAt ? `done ${step.completedAt.slice(0, 10)}` : 'done')}
          </p>
        </div>
        {manualDone && (
          <button
            onClick={() => onUndoDone(step.id)}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
          >
            Undo
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="card-chrome flex h-full flex-col p-5 transition-colors duration-200 hover:border-white/[0.12]">
      <div className="flex items-start justify-between gap-3">
        <span className="font-display text-xs font-medium text-dim tnum">
          {String(index + 1).padStart(2, '0')}
          <span className="text-dim/50"> · {step.kind} · +{step.daysFromNow}d</span>
        </span>
        <button
          onClick={() => onDismiss(step.id)}
          title="Set this step aside"
          aria-label={`Set aside ${step.title}`}
          className="rounded-lg p-1 text-dim/60 transition-colors hover:bg-white/[0.06] hover:text-dim"
        >
          <X size={13} />
        </button>
      </div>

      <h3 className="mt-2 text-sm font-semibold text-light">{step.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-dim">{stepWhyLine(step.notes)}</p>

      {/* done-gate — clears live, with the evidence line once cleared */}
      <div className="mt-3 flex items-start gap-2">
        {done ? (
          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald" />
        ) : (
          <Circle size={14} className="mt-0.5 shrink-0 text-dim/50" />
        )}
        <p className={cn('text-xs leading-relaxed', done ? 'text-emerald' : 'text-light/90')}>
          {done
            ? (evidence ?? 'Done.')
            : 'Clears when the underlying number clears.'}
        </p>
      </div>

      {step.fundingTarget != null && step.fundingLabel && (
        <p className="mt-2 font-display text-[12px] font-medium text-light tnum">
          Target: {step.fundingLabel} — ${step.fundingTarget.toLocaleString('en-US')}
        </p>
      )}

      <div className="mt-auto flex items-center gap-2 pt-4">
        <Link
          to={step.href}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan/25 bg-cyan/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan/15 hover:text-cyan-200"
        >
          {ctaLabel(step.href)}
          <ArrowRight size={12} />
        </Link>
        {!done && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onMarkDone(step.id)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
          >
            <Check size={12} />
            Mark done
          </motion.button>
        )}
      </div>
    </div>
  )
}
