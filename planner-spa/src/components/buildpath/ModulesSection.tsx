import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Download, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBudget, TEMP_HEX } from '@/store/budget'
import { useBuildPath } from '@/store/buildpath'
import {
  PATH_DISCLAIMER,
  computeBindingProgress,
  computePathFreshness,
} from '@/lib/path'
import { downloadTextFile, exportPathMarkdown, pathExportFilename } from '@/lib/path-export'
import ModuleCard from '@/components/buildpath/ModuleCard'
import PreflightCard from '@/components/buildpath/PreflightCard'

/**
 * Section 1 — the canonical Path to Ready (canon lib/readiness/path.ts).
 * Cards render the canon-generated steps, ordered by the binding constraint,
 * with verbatim canon why-lines and done-gates. Live auto-completion runs in
 * the store (evidence-based); done steps collapse into the "Done" group and
 * skipped steps get a quiet restore row. Includes the 60-second pre-flight
 * gate, binding-constraint progress, path freshness, the "Your path changed"
 * note, and markdown export.
 */
export default function ModulesSection() {
  const {
    path,
    assess,
    finance,
    state,
    pathChanged,
    ackPathChange,
    markDone,
    undoDone,
    dismiss,
    undismiss,
    reset,
  } = useBuildPath()
  const { state: budgetState } = useBudget()
  const [doneOpen, setDoneOpen] = useState(false)

  const progress = useMemo(
    () => computeBindingProgress(path, assess, finance),
    [path, assess, finance],
  )
  const freshness = useMemo(
    () => computePathFreshness(path, { financeSavedAt: budgetState.savedAt }),
    [path, budgetState.savedAt],
  )

  const { active, doneSteps, skipped } = useMemo(() => {
    return {
      active: path.steps.filter((s) => s.status === 'pending'),
      doneSteps: path.steps.filter((s) => s.status === 'done'),
      skipped: path.steps.filter((s) => s.status === 'skipped'),
    }
  }, [path.steps])

  const onExport = () => {
    downloadTextFile(pathExportFilename(), exportPathMarkdown(path), 'text/markdown')
  }

  return (
    <section aria-label="Your path to ready">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-label">Your path to ready</h2>
        <span className="font-display text-[11px] text-dim tnum">
          {active.length === 0
            ? 'nothing open'
            : `${active.length} open · ${doneSteps.length} done`}
        </span>
      </div>

      {/* -------- 60-second pre-flight gate (canon preflight.ts) -------- */}
      <div className="mt-4">
        <PreflightCard />
      </div>

      {/* -------- "Your path changed" (canon versions.ts regeneration) -------- */}
      {pathChanged && (
        <div className="card-chrome mt-4 flex items-center justify-between gap-3 border-amber/40 p-4">
          <p className="text-xs leading-relaxed text-light">
            <span className="font-semibold text-amber">Your path changed.</span>{' '}
            <span className="text-dim">
              The numbers underneath it moved, so the steps re-sequenced. Your done marks carried
              over.
            </span>
          </p>
          <button
            onClick={ackPathChange}
            className="shrink-0 rounded-lg border border-amber/30 bg-amber/10 px-3 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/15"
          >
            Got it
          </button>
        </div>
      )}

      {/* -------- binding-constraint progress (canon progress.ts) -------- */}
      <div className="card-chrome mt-4 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-label">Binding constraint</p>
          {progress.ratio != null && (
            <span className="font-display text-[11px] text-dim tnum">
              {Math.round(progress.ratio * 100)}%
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm font-semibold text-light">{progress.label}</p>
        <p className={cn('mt-1 text-xs leading-relaxed', progress.cleared ? 'text-emerald' : 'text-dim')}>
          {progress.detail}
        </p>
        {progress.ratio != null && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: progress.cleared ? TEMP_HEX.emerald : '#22d3ee' }}
              initial={false}
              animate={{ width: `${Math.round(Math.min(1, Math.max(0, progress.ratio)) * 100)}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        )}
        {freshness.isStale && (
          <div className="mt-3 space-y-1 border-t border-white/[0.06] pt-3">
            {freshness.reasons.map((r) => (
              <p key={r} className="text-[11px] leading-relaxed text-amber">
                {r}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* -------- the canon path steps -------- */}
      {active.length > 0 && (
        <div className="mt-4 grid grid-cols-12 gap-4">
          <AnimatePresence mode="popLayout">
            {active.map((s, i) => (
              <motion.div
                key={s.id}
                layout="position"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                transition={{ duration: 0.3, delay: i * 0.05, ease: 'easeOut' }}
                className="col-span-12 md:col-span-6 xl:col-span-4"
              >
                <ModuleCard
                  step={s}
                  index={i}
                  done={false}
                  manualDone={false}
                  onMarkDone={markDone}
                  onUndoDone={undoDone}
                  onDismiss={dismiss}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* -------- Done group -------- */}
      {doneSteps.length > 0 && (
        <div className="card-chrome mt-4 p-5">
          <button
            onClick={() => setDoneOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 text-left"
            aria-expanded={doneOpen}
          >
            <div>
              <p className="text-sm font-semibold text-emerald">Done · {doneSteps.length}</p>
              <p className="mt-0.5 font-serif text-[13px] italic text-dim">
                Done is a place. You're building toward it.
              </p>
            </div>
            <ChevronDown
              size={15}
              className={cn('shrink-0 text-dim transition-transform duration-200', doneOpen && 'rotate-180')}
            />
          </button>
          <AnimatePresence initial={false}>
            {doneOpen && (
              <motion.div
                key="done-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="mt-3 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                  {doneSteps.map((s) => (
                    <ModuleCard
                      key={s.id}
                      step={s}
                      index={0}
                      done
                      manualDone={s.notes.includes('[evidence:manual]')}
                      compact
                      onMarkDone={markDone}
                      onUndoDone={undoDone}
                      onDismiss={dismiss}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* -------- skipped steps: quiet restore -------- */}
      {skipped.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-dim">
          <span>Set aside:</span>
          {skipped.map((s) => (
            <button
              key={s.id}
              onClick={() => undismiss(s.id)}
              className="rounded-full border border-white/[0.08] px-2.5 py-0.5 transition-colors hover:bg-white/[0.06] hover:text-light"
            >
              {s.title} · restore
            </button>
          ))}
        </div>
      )}

      {/* -------- export + reset + section disclaimer -------- */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan/25 bg-cyan/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan/15 hover:text-cyan-200"
        >
          <Download size={12} />
          Download your path
        </button>
        {(doneSteps.length > 0 || skipped.length > 0 || state.checklist.length > 0) && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1 text-[11px] text-dim/70 transition-colors hover:text-dim"
          >
            <RotateCcw size={11} />
            Reset marks and checks
          </button>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-dim/70">{PATH_DISCLAIMER}</p>
    </section>
  )
}
