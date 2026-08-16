import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import { computeScore } from '@/lib/score'
import type { ScoreResult } from '@/lib/score'
import ActIntro, { DIMENSION_HEX } from '@/components/assessment/ActIntro'
import ProgressRing from '@/components/assessment/ProgressRing'
import QuestionCard from '@/components/assessment/QuestionCard'
import ResultScreen from '@/components/assessment/ResultScreen'
import ReviewScreen from '@/components/assessment/ReviewScreen'
import {
  QUESTION_BANK,
  buildAssessmentFlow,
  getQuestionById,
  getQuestionsByDimension,
  stepIndexForQuestion,
} from '@/components/assessment/bank'
import type { ResponseValue } from '@/components/assessment/bank'
import { bankResponsesToInputs } from '@/components/assessment/toInputs'
import {
  clearAssessmentDraft,
  loadAssessmentDraft,
  loadAssessmentResult,
  saveAssessmentDraft,
  saveAssessmentResult,
} from '@/store/assessment'

const TOTAL_QUESTIONS = QUESTION_BANK.length

/**
 * /assessment — the canonical 45-question flow.
 * Three acts in canon DIMENSION_ORDER (Financial Reality → Emotional Truth →
 * Perfect Timing), bank-verbatim questions, draft persistence with mid-flow
 * resume, review screen, then OUR computeScore() via the adapted to-inputs
 * mapping. Local-only — no server calls.
 */
export default function Assessment() {
  const steps = useMemo(() => buildAssessmentFlow('home_buying'), [])
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({})
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'flow' | 'result'>('flow')
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [resumed, setResumed] = useState(false)

  // Hydrate from the versioned draft (resume mid-flow; corrupt/absent → clean start).
  useEffect(() => {
    const draft = loadAssessmentDraft(steps.length - 1)
    if (draft) {
      setResponses(draft.responses)
      setIndex(draft.index)
      setResumed(true)
    }
    setHydrated(true)
  }, [steps])

  // Persist on every move (draft key: homi-assessment-draft-v1).
  useEffect(() => {
    if (!hydrated || phase !== 'flow') return
    saveAssessmentDraft({ responses, index })
  }, [responses, index, hydrated, phase])

  const step = steps[Math.min(index, steps.length - 1)]
  const question = step.kind === 'question' ? getQuestionById(step.questionId) : undefined
  const currentValue = question ? responses[question.id] : undefined
  const canContinue = question ? currentValue !== undefined : true

  const answered = useMemo(
    () => QUESTION_BANK.filter((q) => responses[q.id] !== undefined).length,
    [responses],
  )

  const actProgress = useMemo(() => {
    const dim =
      step.kind === 'intro'
        ? step.dimension
        : step.kind === 'question' && question
          ? question.dimension
          : null
    if (!dim) return null
    const qs = getQuestionsByDimension(dim, 'home_buying')
    return {
      dimension: dim,
      done: qs.filter((q) => responses[q.id] !== undefined).length,
      total: qs.length,
    }
  }, [step, question, responses])

  function goNext() {
    setIndex((i) => Math.min(steps.length - 1, i + 1))
  }

  function goBack() {
    setIndex((i) => Math.max(0, i - 1))
  }

  function startOver() {
    clearAssessmentDraft()
    setResponses({})
    setIndex(0)
    setPhase('flow')
    setResult(null)
    setResumed(false)
  }

  function handleConfirm() {
    const inputs = bankResponsesToInputs(responses)
    const scored = computeScore(inputs)
    const prev = loadAssessmentResult()
    saveAssessmentResult({
      inputs,
      result: scored,
      completedAt: new Date().toISOString(),
      kind: 'full',
      previous: prev
        ? { score: prev.result.score, verdict: prev.result.verdict, completedAt: prev.completedAt }
        : undefined,
    })
    clearAssessmentDraft()
    setResult(scored)
    setPhase('result')
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-navy" role="status" aria-label="Loading">
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-cyan/40 border-t-cyan" />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-navy text-light">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col px-6 py-6">
        {/* header: wordmark + progress rings */}
        <header className="flex items-center justify-between gap-4">
          <span className="font-serif text-lg italic text-light">HōMI</span>
          <div className="flex items-center gap-5">
            {actProgress && (
              <ProgressRing
                done={actProgress.done}
                total={actProgress.total}
                color={DIMENSION_HEX[actProgress.dimension]}
                label={`This act: ${actProgress.done} of ${actProgress.total}`}
              />
            )}
            <ProgressRing
              done={answered}
              total={TOTAL_QUESTIONS}
              color="#e2e8f0"
              label={`Overall: ${answered} of ${TOTAL_QUESTIONS}`}
            />
            <button
              type="button"
              onClick={startOver}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
            >
              <RotateCcw size={13} />
              Start over
            </button>
          </div>
        </header>

        {resumed && phase === 'flow' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center text-xs text-dim/80"
          >
            Picked up right where you left off — your answers are saved on this device.
          </motion.p>
        )}

        {/* body */}
        <main className="flex flex-1 flex-col justify-center py-10">
          <AnimatePresence mode="wait" initial={false}>
            {phase === 'result' && result ? (
              <ResultScreen key="result" result={result} kind="full" />
            ) : step.kind === 'intro' ? (
              <ActIntro key={`intro-${step.dimension}`} dimension={step.dimension} onBegin={goNext} />
            ) : step.kind === 'review' ? (
              <ReviewScreen
                key="review"
                responses={responses}
                onEdit={(qid) => {
                  const target = stepIndexForQuestion(steps, qid)
                  if (target >= 0) setIndex(target)
                }}
                onConfirm={handleConfirm}
              />
            ) : question ? (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="mx-auto w-full max-w-xl"
              >
                <QuestionCard
                  question={question}
                  value={currentValue}
                  accent={DIMENSION_HEX[question.dimension]}
                  onChange={(v) => setResponses((prev) => ({ ...prev, [question.id]: v }))}
                />

                <div className="mt-8 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={index === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-dim transition-colors hover:bg-white/[0.06] hover:text-light disabled:opacity-30"
                  >
                    <ArrowLeft size={15} />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canContinue}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-navy transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                    style={{
                      backgroundColor: DIMENSION_HEX[question.dimension],
                      boxShadow: canContinue ? `0 0 18px ${DIMENSION_HEX[question.dimension]}44` : undefined,
                    }}
                  >
                    Continue
                    <ArrowRight size={15} />
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>

        <footer className="pb-2 text-center text-[11px] leading-relaxed text-dim/60">
          Your answers never leave this device. HōMI provides educational guidance only — not
          financial, legal, tax, mortgage, real estate, or investment advice.
        </footer>
      </div>
    </div>
  )
}
