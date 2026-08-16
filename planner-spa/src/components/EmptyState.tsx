import { motion } from 'framer-motion'

/** Centered empty state — design.md §6.8. Serif-italic poetry + cyan CTA. */
export default function EmptyState({
  line = 'Nothing here yet — your readiness starts with one entry.',
  caption,
  actionLabel,
  onAction,
  illustration = true,
  compact = false,
}: {
  line?: string
  caption?: string
  actionLabel?: string
  onAction?: () => void
  illustration?: boolean
  compact?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-14'}`}
    >
      {illustration && (
        <img
          src="/empty-ledger.svg"
          alt=""
          className={compact ? 'h-24 w-auto opacity-80' : 'h-36 w-auto opacity-80'}
        />
      )}
      <p className={`font-serif italic text-light/90 ${compact ? 'mt-3 text-lg' : 'mt-5 text-xl'}`}>{line}</p>
      {caption && <p className="mt-1.5 max-w-sm text-sm text-dim">{caption}</p>}
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onAction}
          className="mt-5 rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-glow-cyan"
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  )
}
