import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { DIMENSIONS, GENOME_DIMENSIONS, QUESTIONS } from '@/lib/genome'
import GenomeSlider from '@/components/genome/GenomeSlider'
import GenomeResults from '@/components/genome/GenomeResults'
import { useGenomeAnswers } from '@/components/genome/useGenomeAnswers'

const TOTAL_QUESTIONS = QUESTIONS.length // 18 — 9 dimensions × 2

const reveal = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.06, ease: 'easeOut' as const },
})

/**
 * Your Behavioral Genome — 9 decision-psychology dimensions, 2 questions
 * each, scored 0–100 per dimension (canon genome/dimensions.ts, verbatim).
 * Patterns are descriptive, never prescriptive — education only.
 */
export default function Genome() {
  const { answers, setAnswer, resetAnswers } = useGenomeAnswers()
  const [showResults, setShowResults] = useState(false)

  const answeredCount = useMemo(
    () => QUESTIONS.filter((q) => answers[q.id] !== undefined).length,
    [answers],
  )
  const complete = answeredCount === TOTAL_QUESTIONS

  return (
    <div className="flex flex-col gap-6">
      {/* hero */}
      <motion.div {...reveal(0)}>
        <p className="font-serif text-2xl italic leading-snug text-light md:text-3xl">
          The patterns underneath the numbers.
        </p>
        <p className="mt-2 text-sm text-dim">
          Your Behavioral Genome — nine ways you actually decide, measured honestly. There are no
          good or bad answers here.
        </p>
      </motion.div>

      {showResults && complete ? (
        <>
          <motion.div {...reveal(1)}>
            <GenomeResults answers={answers} />
          </motion.div>
          <motion.div {...reveal(2)} className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowResults(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan transition-colors hover:text-light"
            >
              <ArrowLeft size={13} aria-hidden />
              Back to the questions
            </button>
            <button
              type="button"
              onClick={() => {
                resetAnswers()
                setShowResults(false)
              }}
              className="text-xs font-semibold text-dim transition-colors hover:text-light"
            >
              Start over
            </button>
          </motion.div>
        </>
      ) : (
        <>
          {/* progress */}
          <motion.div {...reveal(1)} className="flex items-center justify-between">
            <span className="text-label">Nine dimensions · two questions each</span>
            <span className="text-data-sm text-dim">
              {answeredCount} / {TOTAL_QUESTIONS}
            </span>
          </motion.div>

          {/* question flow, grouped by dimension */}
          <div className="flex flex-col gap-4">
            {DIMENSIONS.map((dim, i) => {
              const meta = GENOME_DIMENSIONS[i]
              const questions = QUESTIONS.filter((q) => q.dimensionKey === dim.key)
              return (
                <motion.section
                  key={dim.key}
                  {...reveal(2 + i)}
                  className="card-chrome p-5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-light">
                      <span
                        className="mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle"
                        style={{ backgroundColor: meta.color }}
                        aria-hidden
                      />
                      {dim.name}
                    </span>
                    <span className="text-label !text-[9px]">
                      {i + 1} of {DIMENSIONS.length}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-dim">{dim.description}</p>

                  <div className="mt-4 flex flex-col gap-5 border-t border-white/[0.06] pt-4">
                    {questions.map((q) => (
                      <div key={q.id}>
                        <label htmlFor={q.id} className="block text-sm leading-relaxed text-light">
                          {q.prompt}
                        </label>
                        <div className="mt-2">
                          <GenomeSlider
                            id={q.id}
                            value={answers[q.id]}
                            onChange={(v) => setAnswer(q.id, v)}
                            leftLabel={q.leftLabel}
                            rightLabel={q.rightLabel}
                            accent={meta.color}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.section>
              )
            })}
          </div>

          {/* results gate */}
          <motion.div {...reveal(2 + DIMENSIONS.length)} className="flex flex-col gap-2">
            <motion.button
              type="button"
              whileHover={complete ? { scale: 1.01 } : undefined}
              whileTap={complete ? { scale: 0.99 } : undefined}
              disabled={!complete}
              onClick={() => setShowResults(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan px-5 py-3 text-sm font-semibold text-navy transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              See your patterns
              <ArrowRight size={14} aria-hidden />
            </motion.button>
            {!complete && (
              <p className="text-center text-[11px] text-dim/80">
                Answer all {TOTAL_QUESTIONS} questions to see your patterns — {answeredCount} so
                far. Answers save on this device as you go.
              </p>
            )}
          </motion.div>
        </>
      )}

      {/* footer — canon register, education only */}
      <motion.p
        {...reveal(3 + DIMENSIONS.length)}
        className="border-t border-white/[0.06] pt-4 text-[11px] leading-relaxed text-dim/70"
      >
        Patterns are not verdicts. The Genome explains how you decide; the HōMI-Score decides
        whether the math is ready. Education only — not financial advice.
      </motion.p>
    </div>
  )
}
