import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { PILLARS } from '@/lib/score'
import { TEMP_HEX } from '@/store/budget'
import { PILLAR_INTRO_COPY } from './bank'
import type { Dimension } from './bank'

export const DIMENSION_HEX: Record<Dimension, string> = {
  financial: '#22d3ee',
  emotional: TEMP_HEX.emerald,
  timing: TEMP_HEX.yellow,
}

const ACT_LABEL: Record<Dimension, string> = {
  financial: 'Act I',
  emotional: 'Act II',
  timing: 'Act III',
}

/**
 * Act intro screen — Fraunces italic pillar label, the pillar question from
 * PILLARS (@/lib/score), and canon intro copy. One per dimension, in
 * DIMENSION_ORDER: Financial Reality → Emotional Truth → Perfect Timing.
 */
export default function ActIntro({ dimension, onBegin }: { dimension: Dimension; onBegin: () => void }) {
  const color = DIMENSION_HEX[dimension]
  const pillar = PILLARS[dimension]
  const copy = PILLAR_INTRO_COPY[dimension]

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-xl flex-col items-center text-center"
    >
      <span className="text-label" style={{ color }}>
        {ACT_LABEL[dimension]}
      </span>
      <h2 className="mt-4 font-serif text-4xl italic leading-tight text-light sm:text-5xl">
        {pillar.label}
      </h2>
      <p className="mt-3 text-lg font-semibold" style={{ color }}>
        {pillar.question}
      </p>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-dim">{copy.description}</p>

      <button
        type="button"
        onClick={onBegin}
        className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-navy transition-transform hover:scale-[1.02] focus-visible:scale-[1.02]"
        style={{ backgroundColor: color, boxShadow: `0 0 24px ${color}55` }}
      >
        Begin
        <ArrowRight size={16} />
      </button>
      <p className="mt-4 text-xs text-dim/70">Fifteen questions. Answer what you know — “I’m not sure” is an honest answer too.</p>
    </motion.div>
  )
}
