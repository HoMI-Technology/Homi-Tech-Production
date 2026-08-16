/* ------------------------------------------------------------------ */
/* ImpactToast — closed-loop score impact, bottom-right (spec §8).     */
/*                                                                     */
/* Reads the store's lastImpact (written by lib/planner/closed-loop.ts */
/* wrappers after every scored mutation). Copy is engine-generated:    */
/* progress-first when the delta is flat ("Path steps complete …       */
/* not yet is not no."). Auto-dismisses; × clears immediately.         */
/* ------------------------------------------------------------------ */

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Compass, HeartPulse, Sparkles, X } from 'lucide-react'
import { usePlannerStore } from '@/store/planner'

const AUTO_DISMISS_MS = 8000

const ACTION_ICONS = {
  bill_paid: CheckCircle2,
  path_done: Compass,
  path_skipped: Compass,
  checkin: HeartPulse,
  generic: Sparkles,
} as const

export default function ImpactToast() {
  const lastImpact = usePlannerStore((s) => s.lastImpact)
  const clearLastImpact = usePlannerStore((s) => s.clearLastImpact)

  useEffect(() => {
    if (!lastImpact) return
    const timer = window.setTimeout(() => clearLastImpact(), AUTO_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [lastImpact, clearLastImpact])

  const Icon =
    ACTION_ICONS[lastImpact?.actionKind as keyof typeof ACTION_ICONS] ??
    Sparkles
  const delta = lastImpact?.delta ?? 0
  const flat = Math.abs(delta) < 0.05

  return (
    <AnimatePresence>
      {lastImpact && (
        <motion.aside
          key={lastImpact.id}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed bottom-4 right-4 z-[70] w-[min(92vw,380px)] rounded-2xl border border-cyan/25 bg-navyLight/95 p-5 shadow-2xl backdrop-blur-md"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-cyan">
              <Icon size={14} />
              Closed loop · {lastImpact.reason}
            </span>
            <button
              type="button"
              onClick={() => clearLastImpact()}
              aria-label="Dismiss closed-loop impact"
              className="rounded-md p-1 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold tnum text-light">
              {lastImpact.fromScore.toFixed(0)} → {lastImpact.toScore.toFixed(0)}
            </span>
            <span
              className={`font-display text-sm font-semibold tnum ${
                delta > 0.05
                  ? 'text-emerald'
                  : delta < -0.05
                    ? 'text-crimson'
                    : 'text-dim'
              }`}
            >
              {delta > 0.05 ? '+' : ''}
              {delta.toFixed(1)}
            </span>
          </div>

          {lastImpact.headline && (
            <p className="mt-2 text-sm font-semibold text-light">
              {lastImpact.headline}
            </p>
          )}
          <p className="mt-1 text-xs leading-relaxed text-dim">
            {lastImpact.detail}
          </p>

          {lastImpact.pathProgress && (
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <span className="text-label">Path</span>
                <span className="font-display text-[11px] font-medium tnum text-dim">
                  {Math.round(lastImpact.pathProgress.after * 100)}% path complete
                </span>
              </div>
              <div className="mt-1.5 h-[4px] overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{
                    width: `${Math.round(lastImpact.pathProgress.before * 100)}%`,
                  }}
                  animate={{
                    width: `${Math.round(lastImpact.pathProgress.after * 100)}%`,
                  }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full bg-emerald shadow-glow-emerald"
                />
              </div>
            </div>
          )}

          {lastImpact.nextHint && (
            <p className="mt-3 text-xs font-medium leading-relaxed text-cyan">
              → {lastImpact.nextHint}
            </p>
          )}
          {flat && !lastImpact.nextHint && (
            <p className="mt-3 text-xs leading-relaxed text-dim">
              Score held steady. Path or cash position may still have moved.
            </p>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
