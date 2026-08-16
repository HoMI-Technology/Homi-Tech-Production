import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { computeScore } from '@/lib/score'
import type { AssessmentInputs, ScoreResult } from '@/lib/score'
import ProgressRing from '@/components/assessment/ProgressRing'
import ResultScreen from '@/components/assessment/ResultScreen'
import { cn } from '@/lib/utils'
import {
  INITIAL_SHADOW_FORM,
  clearShadowDraft,
  loadAssessmentResult,
  loadShadowDraft,
  saveAssessmentResult,
  saveShadowDraft,
} from '@/store/assessment'
import type { ShadowDraftForm } from '@/store/assessment'

/* ------------------------------------------------------------------ */
/* Canon lib/scoring/shadow.ts — ported verbatim.                      */
/* The six highest-signal inputs; the remainder are neutral defaults.  */
/* Same math. Same thresholds. Just a faster read.                     */
/* ------------------------------------------------------------------ */

export interface ShadowInputs {
  debtToIncomeRatio: number
  emergencyFundMonths: number
  creditScore: number
  confidenceLevel: number
  fomoLevel: number
  timeHorizonMonths: number
}

/** Neutral defaults for the inputs the shadow flow does not collect. */
export const SHADOW_DEFAULTS: Omit<AssessmentInputs, keyof ShadowInputs> = {
  downPaymentPercent: 0.1,
  lifeStability: 6,
  partnerAlignment: null,
  savingsRate: 0.1,
  downPaymentProgress: 0.4,
}

/* Canon choice→value maps (lib/assessment/types.ts, verbatim values) */

const EMERGENCY_OPTIONS = [
  { value: 'lt1', label: 'Less than 1 month', months: 0.5 },
  { value: '1to3', label: '1–3 months', months: 2 },
  { value: '3to6', label: '3–6 months', months: 4.5 },
  { value: '6plus', label: '6+ months', months: 8 },
] as const

const CREDIT_OPTIONS = [
  { value: 'excellent', label: 'Excellent (760+)', score: 780 },
  { value: 'good', label: 'Good (700-759)', score: 730 },
  { value: 'fair', label: 'Fair (640-699)', score: 670 },
  { value: 'poor', label: 'Poor (580-639)', score: 610 },
] as const

const HORIZON_OPTIONS = [
  { value: 'lt3', label: 'Less than 3 months', months: 2 },
  { value: '3to6', label: '3–6 months', months: 4 },
  { value: '6to12', label: '6–12 months', months: 9 },
  { value: '12plus', label: '12+ months', months: 18 },
] as const

const ACCENT = '#22d3ee'
const STEPS = 6

function shadowInputsFromForm(form: ShadowDraftForm): ShadowInputs {
  const income = form.monthlyGrossIncome ?? 0
  const debt = form.monthlyDebtPayments ?? 0
  return {
    debtToIncomeRatio: income > 0 ? debt / income : 0,
    emergencyFundMonths:
      EMERGENCY_OPTIONS.find((o) => o.value === form.emergencyFundChoice)?.months ?? 2,
    creditScore: CREDIT_OPTIONS.find((o) => o.value === form.creditBand)?.score ?? 650,
    confidenceLevel: form.confidenceLevel,
    fomoLevel: form.fomoLevel,
    timeHorizonMonths: HORIZON_OPTIONS.find((o) => o.value === form.timeHorizonChoice)?.months ?? 9,
  }
}

/**
 * /shadow — Shadow Score: the canon 6-question quick read. Guest-friendly,
 * no sidebar, no walls of explanation. Runs the full canonical engine with
 * SHADOW_DEFAULTS filling the gaps. Draft: homi-shadow-draft-v1.
 */
export default function ShadowScore() {
  const [form, setForm] = useState<ShadowDraftForm>(INITIAL_SHADOW_FORM)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'flow' | 'result'>('flow')
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const draft = loadShadowDraft(STEPS - 1)
    if (draft) {
      setForm(draft.form)
      setIndex(draft.index)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || phase !== 'flow') return
    saveShadowDraft(form, index)
  }, [form, index, hydrated, phase])

  const patch = (p: Partial<ShadowDraftForm>) => setForm((prev) => ({ ...prev, ...p }))

  const stepValid = useMemo(() => {
    switch (index) {
      case 0:
        return form.monthlyGrossIncome !== null && form.monthlyGrossIncome > 0 && form.monthlyDebtPayments !== null
      case 1:
        return form.emergencyFundChoice !== null
      case 2:
        return form.creditBand !== null
      case 5:
        return form.timeHorizonChoice !== null
      default:
        return true
    }
  }, [index, form])

  function finish() {
    const inputs: AssessmentInputs = { ...SHADOW_DEFAULTS, ...shadowInputsFromForm(form) }
    const scored = computeScore(inputs)
    const prev = loadAssessmentResult()
    saveAssessmentResult({
      inputs,
      result: scored,
      completedAt: new Date().toISOString(),
      kind: 'shadow',
      previous: prev
        ? { score: prev.result.score, verdict: prev.result.verdict, completedAt: prev.completedAt }
        : undefined,
    })
    clearShadowDraft()
    setResult(scored)
    setPhase('result')
  }

  function next() {
    if (index === STEPS - 1) finish()
    else setIndex((i) => Math.min(STEPS - 1, i + 1))
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
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-6 py-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-lg italic text-light">HōMI</span>
            <span className="text-label !text-[9px]">Shadow Score</span>
          </div>
          {phase === 'flow' && (
            <ProgressRing done={index} total={STEPS} color={ACCENT} label={`${index} of ${STEPS} questions`} />
          )}
        </header>

        <main className="flex flex-1 flex-col justify-center py-10">
          <AnimatePresence mode="wait" initial={false}>
            {phase === 'result' && result ? (
              <ResultScreen key="shadow-result" result={result} kind="shadow" />
            ) : (
              <motion.div
                key={`step-${index}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {index === 0 && (
                  <StepShell title="The money in, the money owed." subtitle="Monthly, before taxes on the way in.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <MoneyField
                        label="Monthly gross income"
                        value={form.monthlyGrossIncome}
                        onChange={(v) => patch({ monthlyGrossIncome: v })}
                      />
                      <MoneyField
                        label="Monthly debt payments"
                        value={form.monthlyDebtPayments}
                        onChange={(v) => patch({ monthlyDebtPayments: v })}
                      />
                    </div>
                    <p className="mt-3 text-xs text-dim/70">Student loans, car, cards — the payments that show up every month.</p>
                  </StepShell>
                )}

                {index === 1 && (
                  <StepShell title="If the income stopped, how long could you coast?" subtitle="Months of expenses you could cover from savings.">
                    <ChoiceRow
                      options={EMERGENCY_OPTIONS}
                      selected={form.emergencyFundChoice}
                      onSelect={(v) => patch({ emergencyFundChoice: v })}
                    />
                  </StepShell>
                )}

                {index === 2 && (
                  <StepShell title="Where does your credit sit?" subtitle="A band is enough — no exact number needed.">
                    <ChoiceRow
                      options={CREDIT_OPTIONS}
                      selected={form.creditBand}
                      onSelect={(v) => patch({ creditBand: v })}
                    />
                  </StepShell>
                )}

                {index === 3 && (
                  <StepShell title="How confident do you feel about buying right now?" subtitle="Gut answer. There is no wrong one.">
                    <ShadowSlider
                      value={form.confidenceLevel}
                      onChange={(v) => patch({ confidenceLevel: v })}
                      minLabel="Not at all"
                      maxLabel="Completely"
                    />
                  </StepShell>
                )}

                {index === 4 && (
                  <StepShell title="How much of this is outside pressure?" subtitle="Rising prices, peers buying, family asking. Be honest — it protects you.">
                    <ShadowSlider
                      value={form.fomoLevel}
                      onChange={(v) => patch({ fomoLevel: v })}
                      minLabel="None of it"
                      maxLabel="A lot of it"
                    />
                  </StepShell>
                )}

                {index === 5 && (
                  <StepShell title="When do you want to buy?" subtitle="Your best guess is the right answer.">
                    <ChoiceRow
                      options={HORIZON_OPTIONS}
                      selected={form.timeHorizonChoice}
                      onSelect={(v) => patch({ timeHorizonChoice: v })}
                    />
                  </StepShell>
                )}

                <div className="mt-8 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                    disabled={index === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-dim transition-colors hover:bg-white/[0.06] hover:text-light disabled:opacity-30"
                  >
                    <ArrowLeft size={15} />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    disabled={!stepValid}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan px-5 py-2.5 text-sm font-semibold text-navy shadow-glow-cyan transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100"
                  >
                    {index === STEPS - 1 ? 'See my Shadow Score' : 'Continue'}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="pb-2 text-center text-[11px] leading-relaxed text-dim/60">
          Six questions, one honest first read. HōMI provides educational guidance only — not
          financial, legal, tax, mortgage, real estate, or investment advice.
        </footer>
      </div>
    </div>
  )
}

/* -------- local building blocks -------- */

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold leading-snug text-light">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-dim">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  )
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <label className="block">
      <span className="text-label !text-[9px]">{label}</span>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-display text-sm text-dim">$</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="0"
          value={value === null ? '' : String(value)}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') {
              onChange(null)
              return
            }
            const n = Number(raw)
            if (!Number.isFinite(n) || n < 0) return
            onChange(n)
          }}
          className="w-full rounded-xl border border-white/[0.1] bg-slate py-2.5 pl-8 pr-3 font-display text-base tabular-nums text-light outline-none transition-colors placeholder:text-dim/40 focus:border-cyan/50 focus:ring-2 focus:ring-cyan/20"
        />
      </div>
    </label>
  )
}

function ChoiceRow<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: readonly { value: T; label: string }[]
  selected: T | null
  onSelect: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-2.5" role="radiogroup">
      {options.map((opt) => {
        const active = selected === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(opt.value)}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
              active
                ? 'border-cyan/60 bg-white/[0.07] text-light shadow-[0_0_18px_rgba(34,211,238,0.15)]'
                : 'border-white/[0.08] bg-white/[0.02] text-light/85 hover:border-white/[0.16] hover:bg-white/[0.05]',
            )}
          >
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                active ? 'border-cyan' : 'border-dim/50',
              )}
            >
              {active && <span className="h-2 w-2 rounded-full bg-cyan" />}
            </span>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function ShadowSlider({
  value,
  onChange,
  minLabel,
  maxLabel,
}: {
  value: number
  onChange: (v: number) => void
  minLabel: string
  maxLabel: string
}) {
  const frac = (value - 1) / 9
  return (
    <div>
      <style>{`
        .shadow-range { -webkit-appearance: none; appearance: none; width: 100%; height: 24px; background: transparent; cursor: pointer; }
        .shadow-range:focus { outline: none; }
        .shadow-range::-webkit-slider-runnable-track { height: 4px; border-radius: 999px; background: var(--shadow-track, rgba(255,255,255,0.06)); }
        .shadow-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 999px; background: #22d3ee; border: none; margin-top: -6px; box-shadow: 0 0 10px rgba(34,211,238,0.55); }
        .shadow-range::-moz-range-track { height: 4px; border-radius: 999px; background: rgba(255,255,255,0.06); }
        .shadow-range::-moz-range-progress { height: 4px; border-radius: 999px; background: #22d3ee; }
        .shadow-range::-moz-range-thumb { width: 16px; height: 16px; border-radius: 999px; background: #22d3ee; border: none; box-shadow: 0 0 10px rgba(34,211,238,0.55); }
      `}</style>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-dim/80">{minLabel}</span>
        <span className="font-display text-2xl font-semibold tabular-nums text-cyan">{value}</span>
        <span className="text-xs font-medium uppercase tracking-wider text-dim/80">{maxLabel}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="shadow-range mt-2"
        style={
          {
            '--shadow-track': `linear-gradient(90deg, #22d3ee ${frac * 100}%, rgba(255,255,255,0.06) ${frac * 100}%)`,
          } as React.CSSProperties
        }
      />
      <div className="flex justify-between font-display text-[10px] tabular-nums text-dim/60">
        <span>1</span>
        <span>10</span>
      </div>
    </div>
  )
}
