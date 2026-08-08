"use client";

import { motion } from 'framer-motion'
import {
  Check,
  CircleDashed,
  Clock,
  Flag,
  RotateCcw,
  SkipForward,
  Trash2,
} from 'lucide-react'
import { bindingConstraintLabel } from "@/lib/readiness/path"
import { PATH_LEGAL_SHORT } from "@/lib/readiness/legal"
import type { PathStepKind } from '@/lib/planner/types'
import { completePathStepWithImpact } from '@/lib/planner/closed-loop'
import { addDaysISO } from '@/lib/planner/derived'
import { usePlannerStore } from "@/lib/planner/store"
import EmptyState from "@/components/planner/ui/EmptyState"
import { PlanFooter, PlanSectionHeader, VerdictChip } from './ui'

/* ------------------------------------------------------------------ */
/* Path sub-tab — Path to Ready (spec §7).                             */
/*                                                                     */
/* Sequence comes from the canon binding-constraint engine via the     */
/* store's regeneratePath (never the reference's 75/55 scorer). Step   */
/* completion flows exclusively through the closed loop —              */
/* completePathStepWithImpact snapshots the score, emits the           */
/* ScoreImpact toast with progress-first copy when the delta is flat,  */
/* and never regenerates the path on completion.                       */
/* ------------------------------------------------------------------ */

const KIND_ICON: Record<PathStepKind, typeof Flag> = {
  milestone: Flag,
  deadline: Clock,
  review: RotateCcw,
}

/** Resolved ratio — same semantics as the closed loop: done + skipped
 * over non-REASSESS steps. Displayed as "resolved", never "complete". */
function resolvedRatio(steps: Array<{ reasonCode: string; status: string }>) {
  const actionable = steps.filter((s) => s.reasonCode !== 'REASSESS')
  const pool = actionable.length > 0 ? actionable : steps
  if (pool.length === 0) return 1
  return pool.filter((s) => s.status !== 'pending').length / pool.length
}

export default function PlanPath() {
  const path = usePlannerStore((s) => s.path)
  const regeneratePath = usePlannerStore((s) => s.regeneratePath)
  const clearPath = usePlannerStore((s) => s.clearPath)

  if (!path) {
    return (
      <section className="glass p-5 sm:p-6">
        <PlanSectionHeader
          eyebrow="PATH TO READY"
          title="Turn live numbers into sequenced moves"
        />
        <EmptyState
          compact
          line="Generate a protective sequence from live numbers"
          caption="One binding constraint at a time — not a checklist wall."
          actionLabel="Generate Path"
          onAction={regeneratePath}
        />
        <PlanFooter lines={[PATH_LEGAL_SHORT]} />
      </section>
    )
  }

  const ratio = resolvedRatio(path.steps)
  const pct = Math.round(ratio * 100)
  const allResolved = pct >= 100
  const createdDate = path.createdAt.slice(0, 10)

  return (
    <section className="glass p-5 sm:p-6">
      <PlanSectionHeader
        eyebrow="PATH TO READY"
        title="Turn live numbers into sequenced moves"
        right={<VerdictChip verdict={path.verdict} />}
      />

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="font-display text-[13px] text-dim">
          Score at generation{' '}
          <span className="font-semibold text-light">{path.score}</span>
          <span className="text-dim/70"> of 100</span>
        </p>
        <p className="text-[13px] text-dim">
          Binding:{' '}
          <span className="font-semibold text-light">
            {bindingConstraintLabel(path.bindingConstraint)}
          </span>
        </p>
        <p className="font-display text-[13px] text-dim">
          {pct}% resolved
        </p>
      </div>

      {path.mode === 'ready_optional' && (
        <p className="mt-3 rounded-xl border border-emerald/25 bg-emerald/[0.08] px-3.5 py-2.5 text-[13px] text-emerald">
          Path: READY band — optional maintenance only
        </p>
      )}

      {/* progress bar */}
      <div className="mt-4 h-[5px] overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${allResolved ? 'bg-emerald' : 'bg-cyan'}`}
        />
      </div>

      {allResolved && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl border border-emerald/25 bg-emerald/[0.08] px-4 py-3"
        >
          <p className="font-serif text-[16px] italic text-emerald">
            Path steps complete — reassess when life moves
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-dim">
            Protective homework on this path is clear. Reassess when life
            inputs change — not yet is not no.
          </p>
        </motion.div>
      )}

      <ol className="mt-5 flex flex-col gap-3">
        {path.steps.map((step, i) => {
          const Icon = KIND_ICON[step.kind] ?? Flag
          const pending = step.status === 'pending'
          return (
            <motion.li
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05, ease: 'easeOut' }}
              className={`rounded-xl border px-4 py-3.5 ${
                pending
                  ? 'border-white/[0.08] bg-white/[0.02]'
                  : step.status === 'done'
                    ? 'border-emerald/25 bg-emerald/[0.05]'
                    : 'border-amber/25 bg-amber/[0.05]'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      pending
                        ? 'bg-cyan/[0.08] text-cyan'
                        : step.status === 'done'
                          ? 'bg-emerald/[0.12] text-emerald'
                          : 'bg-amber/[0.12] text-amber'
                    }`}
                  >
                    <Icon size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold leading-snug text-light">
                      {step.title}
                    </p>
                    <p className="mt-1 font-display text-[11px] uppercase tracking-[0.08em] text-dim">
                      {step.kind} · due {addDaysISO(createdDate, step.daysFromNow)}
                      {step.completedAt &&
                        ` · ${step.status} ${step.completedAt.slice(0, 10)}`}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    pending
                      ? 'bg-white/[0.06] text-dim'
                      : step.status === 'done'
                        ? 'bg-emerald/10 text-emerald'
                        : 'bg-amber/10 text-amber'
                  }`}
                >
                  {pending ? (
                    <span className="inline-flex items-center gap-1">
                      <CircleDashed size={10} /> Pending
                    </span>
                  ) : step.status === 'done' ? (
                    <span className="inline-flex items-center gap-1">
                      <Check size={10} /> Done
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <SkipForward size={10} /> Skipped
                    </span>
                  )}
                </span>
              </div>

              <p className="mt-2.5 text-[12px] leading-relaxed text-dim">
                {step.notes}
              </p>

              {step.fundingTarget != null && (
                <p className="mt-2 text-[12px] text-dim">
                  {step.fundingLabel ?? 'Funding target'}:{' '}
                  <span className="font-display font-semibold text-cyan">
                    ${step.fundingTarget.toLocaleString('en-US')}
                  </span>
                </p>
              )}

              {pending && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => completePathStepWithImpact(step.id, 'done')}
                    className="rounded-lg bg-cyan px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:bg-cyan/90"
                  >
                    Mark done
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      completePathStepWithImpact(step.id, 'skipped')
                    }
                    className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] font-semibold text-dim transition-colors hover:text-light"
                  >
                    Skip honestly
                  </button>
                </div>
              )}
            </motion.li>
          )
        })}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={regeneratePath}
          className="flex items-center gap-2 rounded-xl bg-cyan px-4 py-2 text-[13px] font-semibold text-navy shadow-glow-cyan transition-colors hover:bg-cyan/90"
        >
          <RotateCcw size={14} />
          Rebuild my path
        </button>
        <button
          type="button"
          onClick={clearPath}
          className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3.5 py-2 text-[12px] font-semibold text-dim transition-colors hover:text-light"
        >
          <Trash2 size={13} />
          Clear path
        </button>
        <p className="w-full text-[11px] leading-relaxed text-dim/80 sm:w-auto sm:flex-1">
          Fresh numbers, fresh sequence — rebuilding never counts against you.
        </p>
      </div>

      <PlanFooter lines={[PATH_LEGAL_SHORT]} />
    </section>
  )
}
