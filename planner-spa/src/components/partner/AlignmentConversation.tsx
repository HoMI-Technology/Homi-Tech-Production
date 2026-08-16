import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { usePartner } from '@/store/partner'
import { cn } from '@/lib/utils'

/** The five canon conversation prompts (module spec §4 — verbatim). */
const PROMPTS = [
  'What would have to be true for you to feel ready — not just be ready?',
  "Whose timeline are we actually on — ours, or someone else's?",
  'If the market dropped 10% the month after we bought, what would we do?',
  'What are we each afraid to say out loud about this?',
  "What would 'waited one more year' cost us — really?",
]

/**
 * Section 4 — the alignment conversation (module spec §4, M7 moat).
 * Static prompt list; check state persists in the partner store
 * (homi-partner-v1), nothing leaves this device.
 */
export default function AlignmentConversation() {
  const { checks, toggleCheck } = usePartner()
  const done = checks.filter(Boolean).length

  return (
    <div className="card-chrome flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="text-label">The alignment conversation</span>
        <span className="text-data-sm text-dim">
          {done} <span className="text-dim/70">/ {PROMPTS.length}</span>
        </span>
      </div>

      <p className="mt-3 font-serif text-base italic text-dim">
        The score finds the gap. These close it.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {PROMPTS.map((prompt, i) => {
          const checked = Boolean(checks[i])
          return (
            <li key={prompt}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggleCheck(i)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border border-white/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]',
                  checked && 'border-emerald/25 bg-emerald/[0.06]',
                )}
              >
                <motion.span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                    checked ? 'border-emerald bg-emerald/20 text-emerald' : 'border-white/[0.15] text-transparent',
                  )}
                  whileTap={{ scale: 0.85 }}
                  aria-hidden
                >
                  <Check size={12} strokeWidth={3} />
                </motion.span>
                <span
                  className={cn(
                    'text-sm leading-relaxed transition-colors',
                    checked ? 'text-dim' : 'text-light',
                  )}
                >
                  {prompt}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="mt-4 border-t border-white/[0.06] pt-3 text-[11px] text-dim/80">
        Checked off on this device only — nobody else sees where you are in the conversation.
      </p>
    </div>
  )
}
