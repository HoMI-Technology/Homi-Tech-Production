import { AnimatePresence, motion } from 'framer-motion'
import { ShieldAlert, TriangleAlert } from 'lucide-react'
import { HARD_STOP_MESSAGES, WARNING_MESSAGES } from '@/lib/score'
import type { ScoreResult } from '@/lib/score'

/**
 * Hard-stop crimson banner — only rendered while hardStops.length > 0.
 * Protective copy verbatim from engine.ts; enters with a height spring.
 */
export function HardStopBanner({ result }: { result: ScoreResult }) {
  const show = result.hardStops.length > 0
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="hard-stops"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 28 }}
          className="overflow-hidden"
        >
          <div className="rounded-2xl border border-crimson/30 bg-crimson/10 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-crimson/15 text-crimson">
                <ShieldAlert size={16} />
              </span>
              <h2 className="text-h2">A red line, not a rejection.</h2>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {result.hardStops.map((stop) => (
                <li key={stop} className="flex gap-2.5 text-sm leading-relaxed text-light/90">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-crimson" />
                  {HARD_STOP_MESSAGES[stop]}
                </li>
              ))}
            </ul>
            {/* Dignified results (M3): a hard stop always pairs with agency. */}
            <p className="mt-3 border-t border-crimson/20 pt-3 text-xs font-medium text-light/80">
              This is not a no. It is a not-yet, with a path.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Warnings banner — amber, slim, canon protective tone. */
export function WarningsBanner({ result }: { result: ScoreResult }) {
  const show = result.warnings.length > 0
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="warnings"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 28 }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-2 rounded-2xl border border-amber/30 bg-amber/10 px-5 py-3.5 backdrop-blur-sm">
            {result.warnings.map((warning) => (
              <div key={warning} className="flex items-start gap-2.5 text-sm leading-relaxed text-light/90">
                <TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber" />
                {WARNING_MESSAGES[warning]}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
