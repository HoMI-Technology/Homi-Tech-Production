import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Hammer } from 'lucide-react'

/**
 * Section 5 — joint build path CTA (module spec §5).
 * The Build Path is shared: same numbers, same definitions of done.
 */
export default function BuildPathCard() {
  return (
    <div className="card-chrome relative overflow-hidden p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
            <Hammer size={16} aria-hidden />
          </span>
          <div>
            <h2 className="text-h2">Build together</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-dim">
              The Build Path is the same for both of you: same numbers, same definitions of done.
            </p>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Link
            to="/buildpath"
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-navy shadow-glow-cyan transition-colors hover:bg-cyan-300"
          >
            Open the Build Path
            <ArrowRight size={15} aria-hidden />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
