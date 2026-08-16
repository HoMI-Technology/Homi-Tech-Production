import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { useConfidence } from '@/lib/confidence'
import type { ConfidenceLevel } from '@/lib/confidence'
import { clamp } from '@/lib/score'
import { cn } from '@/lib/utils'
import { useBudget } from '@/store/budget'

const LEVEL_HEX: Record<ConfidenceLevel, string> = {
  high: '#34d399', // emerald
  medium: '#facc15', // gold
  low: '#fab633', // amber
}

const LEVEL_LABEL: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

/**
 * Confidence chip (M2/M10 "Confidence as UI") — sits inline beside the
 * score under the compass. Click expands the factor list; a low level
 * reframes the score as a range and offers a path to sharpen it.
 */
export default function ConfidenceChip({ score }: { score: number }) {
  const [open, setOpen] = useState(false)
  const confidence = useConfidence()
  const { state } = useBudget()

  const hex = LEVEL_HEX[confidence.level]
  const fresh = confidence.factors.find((f) => f.key === 'freshness')?.ok ?? false
  const entries = state.transactions.length

  // Low confidence → range phrasing: score ± round((1 − value) × 20), clamped 0–100.
  const half = Math.round((1 - confidence.value) * 20)
  const lo = Math.round(clamp(score - half, 0, 100))
  const hi = Math.round(clamp(score + half, 0, 100))

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-light/90 transition-colors hover:bg-white/[0.06]"
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: hex, boxShadow: `0 0 6px ${hex}80` }}
        />
        {LEVEL_LABEL[confidence.level]}
        <span className="text-dim">
          · {entries} entries, {fresh ? 'fresh' : 'aging'}
        </span>
        <ChevronDown
          size={12}
          className={cn('text-dim transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="confidence-factors"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="overflow-hidden"
          >
            <ul className="mt-2 flex w-full min-w-[240px] flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-navyLight/60 p-3">
              {confidence.factors.map((f) => (
                <li key={f.key} className="flex items-start gap-2 text-[11px] leading-snug">
                  {f.ok ? (
                    <Check size={12} className="mt-0.5 shrink-0 text-emerald" />
                  ) : (
                    <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                  )}
                  <span className="min-w-0">
                    <span className="font-medium text-light/90">{f.label}</span>
                    <span className="block text-dim">{f.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {confidence.level === 'low' && (
        <div className="mt-2 max-w-[260px]">
          <p className="text-[11px] leading-snug text-dim">
            Read this as a range, not a point: ~{lo}–{hi}
          </p>
          <Link
            to="/trust#audit"
            className="mt-0.5 inline-block text-[11px] font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
          >
            Sharpen this
          </Link>
        </div>
      )}
    </div>
  )
}
