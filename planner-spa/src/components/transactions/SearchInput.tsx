import { forwardRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Top-bar search for the ledger (transactions.md §1).
 * 240px → 320px on focus (200ms), cyan ring, Esc clears, matches label fades in.
 */
const SearchInput = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (v: string) => void; matchCount: number | null }
>(function SearchInput({ value, onChange, matchCount }, ref) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-slate px-3 py-2 transition-all duration-200',
          focused ? 'w-[320px] border-white/[0.12] ring-2 ring-cyan-400/50' : 'w-[240px] border-white/[0.08]',
        )}
      >
        <Search size={14} className="shrink-0 text-dim" />
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              onChange('')
            }
          }}
          placeholder="Search descriptions or amounts…"
          aria-label="Search transactions"
          className="w-full bg-transparent text-sm text-light placeholder:text-dim/60 focus:outline-none"
        />
      </div>
      <AnimatePresence>
        {matchCount !== null && (
          <motion.span
            key="match-count"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="whitespace-nowrap text-xs text-dim"
          >
            {matchCount} {matchCount === 1 ? 'match' : 'matches'}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
})

export default SearchInput
