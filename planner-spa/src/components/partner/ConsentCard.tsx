import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useReadinessManual } from '@/store/readiness'

/**
 * Section 1 — consent + model card (module spec §1).
 * Static explainer (emerald left border) + live mode status derived from the
 * readiness manual inputs. The solo toggle itself stays in Readiness — this
 * card only reports the mode and links there.
 */
export default function ConsentCard() {
  const { manual } = useReadinessManual()
  const solo = manual.partnerAlignment === null

  return (
    <div className="card-chrome flex h-full flex-col border-l-2 border-l-emerald p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-emerald" aria-hidden />
        <span className="text-label">How partner mode works</span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-dim">
        Partner mode runs two private sets of answers and one shared score. Each person answers
        for themselves; the engine weighs both emotional readings equally. Nothing here is shared
        with anyone — this device, this browser, that&rsquo;s it. Both people should answer
        honestly; the math protects you only if you do.
      </p>

      <div className="mt-auto pt-5">
        <div className="flex items-center gap-2 border-t border-white/[0.06] pt-4">
          <span
            className={`h-1.5 w-1.5 rounded-full animate-pulse-dot ${solo ? 'bg-dim' : 'bg-emerald'}`}
            aria-hidden
          />
          <p className="text-xs text-dim">
            {solo
              ? 'Currently: Solo — the engine redistributes partner points to you.'
              : 'Currently: Two-person scoring is active.'}
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="mt-3">
          <Link
            to="/readiness"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] px-3 py-2 text-xs font-semibold text-light transition-colors hover:bg-white/[0.06] hover:text-cyan"
          >
            Change this in Readiness
            <ArrowRight size={13} aria-hidden />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
