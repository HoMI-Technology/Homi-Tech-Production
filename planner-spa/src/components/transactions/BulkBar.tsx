import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Trash2, X } from 'lucide-react'
import { useBudget } from '@/store/budget'
import { categoryIcon } from '@/components/CategoryIcon'
import { cn } from '@/lib/utils'

/**
 * Sticky bulk action bar (transactions.md §4): slides up when rows are selected.
 * "N selected — Delete · Categorize". Full-width bottom sheet under 640px.
 */
export default function BulkBar({
  count,
  onDelete,
  onCategorize,
  onClear,
}: {
  count: number
  onDelete: () => void
  onCategorize: (categoryId: string) => void
  onClear: () => void
}) {
  const { state } = useBudget()
  const [catOpen, setCatOpen] = useState(false)
  const catRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!catOpen) return
    const onDown = (e: MouseEvent) => {
      if (!catRef.current?.contains(e.target as Node)) setCatOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCatOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [catOpen])

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="bulk-bar"
          initial={{ y: 72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 72, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-xl sm:inset-x-0 sm:bottom-6"
        >
          <div className="flex items-center gap-2 rounded-2xl border border-white/[0.1] bg-navyLight/95 px-4 py-3 shadow-2xl backdrop-blur max-sm:rounded-xl">
            <p className="text-sm font-semibold text-light">
              {count} selected
            </p>
            <div className="ml-auto flex items-center gap-1.5">
              {/* categorize popover */}
              <div ref={catRef} className="relative">
                <button
                  onClick={() => setCatOpen((o) => !o)}
                  className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
                >
                  Categorize
                  <ChevronDown size={13} className={cn('transition-transform duration-150', catOpen && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {catOpen && (
                    <motion.div
                      key="cat-menu"
                      initial={{ scale: 0.96, y: 4, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      exit={{ scale: 0.97, y: 4, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute bottom-full right-0 z-30 mb-1.5 max-h-[280px] w-52 origin-bottom-right overflow-y-auto rounded-xl border border-white/[0.1] bg-navyLight p-1.5 shadow-2xl"
                    >
                      {state.categories.map((c) => {
                        const Icon = categoryIcon(c.icon)
                        return (
                          <button
                            key={c.id}
                            onClick={() => {
                              onCategorize(c.id)
                              setCatOpen(false)
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-dim transition-colors hover:bg-white/[0.04] hover:text-light"
                          >
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded-lg"
                              style={{ backgroundColor: `${c.color}1a`, color: c.color }}
                            >
                              <Icon size={12} />
                            </span>
                            <span className="flex-1 text-left">{c.name}</span>
                            <Check size={12} className="opacity-0" />
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={onDelete}
                className="flex items-center gap-1.5 rounded-xl bg-crimson px-3.5 py-2 text-sm font-semibold text-white shadow-glow-crimson"
              >
                <Trash2 size={14} />
                Delete
              </motion.button>
              <button
                onClick={onClear}
                aria-label="Clear selection"
                className="rounded-xl p-2 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
