import { motion } from 'framer-motion'
import { ArrowRight, Pencil } from 'lucide-react'
import { DIMENSION_ORDER, formatAnswer, getQuestionsByDimension, weightedPoints } from './bank'
import type { ResponseValue } from './bank'
import { DIMENSION_HEX } from './ActIntro'
import { PILLARS } from '@/lib/score'

/**
 * Review screen — every answer, grouped by act, with the bank-weighted
 * signal points (bank scoring_function × bank weight — never re-derived).
 * Edit jumps back to that question; confirm moves to scoring.
 */
export default function ReviewScreen({
  responses,
  onEdit,
  onConfirm,
}: {
  responses: Record<string, ResponseValue>
  onEdit: (questionId: string) => void
  onConfirm: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mx-auto w-full max-w-2xl"
    >
      <div className="text-center">
        <span className="text-label">Review</span>
        <h2 className="mt-3 font-serif text-3xl italic text-light sm:text-4xl">Look it over once.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-dim">
          This is what you told us, in your own words. Fix anything that is off — the score only
          sees what is true.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {DIMENSION_ORDER.map((dim) => {
          const color = DIMENSION_HEX[dim]
          const questions = getQuestionsByDimension(dim, 'home_buying')
          return (
            <section key={dim} className="card-chrome p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color }}>
                  {PILLARS[dim].label}
                </h3>
                <span className="text-label !text-[9px]">{PILLARS[dim].question}</span>
              </div>
              <ul className="mt-4 flex flex-col divide-y divide-white/[0.05]">
                {questions.map((q) => {
                  const pts = weightedPoints(q, responses[q.id])
                  return (
                    <li key={q.id} className="flex items-start gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-snug text-dim">{q.question_text}</p>
                        <p className="mt-1 text-sm font-medium text-light">{formatAnswer(q, responses[q.id])}</p>
                      </div>
                      <span className="shrink-0 font-display text-[11px] tabular-nums text-dim/70" title="Bank-weighted signal points">
                        {pts === null ? '—' : pts}
                      </span>
                      <button
                        type="button"
                        onClick={() => onEdit(q.id)}
                        aria-label={`Edit answer: ${q.question_text}`}
                        className="shrink-0 rounded-md p-1.5 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
                      >
                        <Pencil size={13} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan px-7 py-3 text-sm font-semibold text-navy shadow-glow-cyan transition-transform hover:scale-[1.02]"
        >
          See my score
          <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  )
}
