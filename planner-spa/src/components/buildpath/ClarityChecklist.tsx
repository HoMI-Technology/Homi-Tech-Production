import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useBuildPath } from '@/store/buildpath'

type ClarityItem = {
  id: string
  text: string
  /** Anchor to scroll to when the item is activated. */
  scrollTo?: string
}

const CLARITY_ITEMS: ClarityItem[] = [
  { id: 'rerun-numbers', text: 'Re-run your numbers with the real home price' },
  { id: 'stress-rate', text: 'Stress-test the payment at +2% rate', scrollTo: 'shocks' },
  { id: 'walk-neighborhood', text: 'Walk the neighborhood at three different hours' },
  { id: 'sit-week', text: 'Sit with the decision for one full week' },
  { id: 'read-inspection', text: 'Read every line of the inspection before you waive anything' },
]

/**
 * Section 2 — Clarity checklist (READY-state content, M5 CTA target).
 * Static, checkable, persisted in the buildpath store. Calm and protective:
 * the math saying "ready" is the start of diligence, not the end of it.
 */
export default function ClarityChecklist() {
  const { state, toggleChecklist } = useBuildPath()
  const checkedCount = CLARITY_ITEMS.filter((i) => state.checklist.includes(i.id)).length

  const activate = (item: ClarityItem) => {
    toggleChecklist(item.id)
    if (item.scrollTo) {
      document.getElementById(item.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section aria-label="Clarity checklist">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-label">Clarity checklist</h2>
        <span className="font-display text-[11px] text-dim tnum">
          {checkedCount} / {CLARITY_ITEMS.length}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-dim">
        For when the math says ready. Run these before you treat the decision as done.
      </p>

      <div className="card-chrome mt-4 divide-y divide-white/[0.06] p-2">
        {CLARITY_ITEMS.map((item) => {
          const checked = state.checklist.includes(item.id)
          return (
            <button
              key={item.id}
              role="checkbox"
              aria-checked={checked}
              onClick={() => activate(item)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.03]"
            >
              <motion.span
                initial={false}
                animate={{
                  backgroundColor: checked ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.03)',
                  borderColor: checked ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.12)',
                }}
                transition={{ duration: 0.15 }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
              >
                {checked && <Check size={12} className="text-emerald" />}
              </motion.span>
              <span
                className={cn(
                  'text-sm leading-relaxed transition-colors',
                  checked ? 'text-dim line-through decoration-white/20' : 'text-light',
                )}
              >
                {item.text}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
