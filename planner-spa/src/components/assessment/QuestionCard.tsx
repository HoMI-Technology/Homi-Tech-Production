import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ChoiceOption, Question, ResponseValue, SliderConfig } from './bank'

/**
 * QuestionCard — renders one canonical bank question. Question text and
 * option labels are verbatim from the bank; unknown/“not sure” choices are
 * ordinary bank options with their own canon scores.
 */
export default function QuestionCard({
  question,
  value,
  onChange,
  accent,
}: {
  question: Question
  value: ResponseValue | undefined
  onChange: (v: ResponseValue) => void
  accent: string
}) {
  return (
    <div className="w-full">
      <p className="text-label !text-[9px]" style={{ color: accent }}>
        {question.category.replace(/_/g, ' ')}
      </p>
      <h3 className="mt-2 text-xl font-semibold leading-snug text-light sm:text-2xl">
        {question.question_text}
      </h3>

      <div className="mt-6">
        {question.question_type === 'single_choice' && Array.isArray(question.options) && (
          <ChoiceList options={question.options} value={value} accent={accent} onChange={onChange} />
        )}
        {question.question_type === 'slider' && question.options && !Array.isArray(question.options) && (
          <BankSlider config={question.options} value={value} accent={accent} onChange={onChange} />
        )}
        {question.question_type === 'number' && (
          <BankNumber question={question} value={value} accent={accent} onChange={onChange} />
        )}
      </div>
    </div>
  )
}

/* -------- single choice -------- */

function ChoiceList({
  options,
  value,
  accent,
  onChange,
}: {
  options: ChoiceOption[]
  value: ResponseValue | undefined
  accent: string
  onChange: (v: ResponseValue) => void
}) {
  return (
    <div className="flex flex-col gap-2.5" role="radiogroup">
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <motion.button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            whileTap={{ scale: 0.99 }}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
              selected
                ? 'border-transparent bg-white/[0.07] text-light'
                : 'border-white/[0.08] bg-white/[0.02] text-light/85 hover:border-white/[0.16] hover:bg-white/[0.05]',
            )}
            style={selected ? { borderColor: `${accent}88`, boxShadow: `0 0 0 1px ${accent}55, 0 0 18px ${accent}22` } : undefined}
          >
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
              style={{ borderColor: selected ? accent : 'rgba(148,163,184,0.5)' }}
            >
              {selected && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />}
            </span>
            {opt.label}
          </motion.button>
        )
      })}
    </div>
  )
}

/* -------- slider (bank SliderConfig, canon 1–10) -------- */

function BankSlider({
  config,
  value,
  accent,
  onChange,
}: {
  config: SliderConfig
  value: ResponseValue | undefined
  accent: string
  onChange: (v: ResponseValue) => void
}) {
  const current = typeof value === 'number' ? value : Math.round((config.min + config.max) / 2)
  const frac = config.max === config.min ? 1 : (current - config.min) / (config.max - config.min)

  return (
    <div>
      <style>{`
        .bank-range { -webkit-appearance: none; appearance: none; width: 100%; height: 24px; background: transparent; cursor: pointer; }
        .bank-range:focus { outline: none; }
        .bank-range::-webkit-slider-runnable-track { height: 4px; border-radius: 999px; background: var(--bank-track, rgba(255,255,255,0.06)); }
        .bank-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 999px; background: var(--bank-accent, #22d3ee); border: none; margin-top: -6px; box-shadow: 0 0 10px var(--bank-glow, rgba(34,211,238,0.55)); }
        .bank-range::-moz-range-track { height: 4px; border-radius: 999px; background: rgba(255,255,255,0.06); }
        .bank-range::-moz-range-progress { height: 4px; border-radius: 999px; background: var(--bank-accent, #22d3ee); }
        .bank-range::-moz-range-thumb { width: 16px; height: 16px; border-radius: 999px; background: var(--bank-accent, #22d3ee); border: none; box-shadow: 0 0 10px var(--bank-glow, rgba(34,211,238,0.55)); }
      `}</style>

      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-dim/80">{config.min_label}</span>
        <span className="font-display text-2xl font-semibold tabular-nums" style={{ color: accent }}>
          {value === undefined ? '—' : current}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-dim/80">{config.max_label}</span>
      </div>
      <input
        type="range"
        min={config.min}
        max={config.max}
        step={1}
        value={current}
        aria-valuemin={config.min}
        aria-valuemax={config.max}
        aria-valuenow={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bank-range mt-2"
        style={
          {
            '--bank-accent': accent,
            '--bank-glow': `${accent}8c`,
            '--bank-track': `linear-gradient(90deg, ${accent} ${frac * 100}%, rgba(255,255,255,0.06) ${frac * 100}%)`,
          } as React.CSSProperties
        }
      />
      <div className="flex justify-between font-display text-[10px] tabular-nums text-dim/60">
        <span>{config.min}</span>
        <span>{config.max}</span>
      </div>
    </div>
  )
}

/* -------- numeric input (bank unit, e.g. usd) -------- */

function BankNumber({
  question,
  value,
  accent,
  onChange,
}: {
  question: Question
  value: ResponseValue | undefined
  accent: string
  onChange: (v: ResponseValue) => void
}) {
  const sf = question.scoring_function
  const usd = 'unit' in sf && sf.unit === 'usd'
  const max = 'max' in sf ? sf.max : undefined
  const [text, setText] = useState(value === undefined ? '' : String(value))

  // Keep the field in sync when navigating back to an answered question.
  useEffect(() => {
    setText(value === undefined ? '' : String(value))
  }, [value, question.id])

  return (
    <div className="relative max-w-xs">
      {usd && (
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display text-sm text-dim">$</span>
      )}
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        placeholder="0"
        value={text}
        onChange={(e) => {
          const raw = e.target.value
          setText(raw)
          if (raw === '') return
          const n = Number(raw)
          if (!Number.isFinite(n) || n < 0) return
          onChange(max !== undefined ? Math.min(max, n) : n)
        }}
        className={cn(
          'w-full rounded-xl border border-white/[0.1] bg-slate px-4 py-3 font-display text-lg tabular-nums text-light outline-none transition-colors placeholder:text-dim/40',
          usd && 'pl-8',
        )}
        style={{ caretColor: accent }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = `${accent}88`
          e.currentTarget.style.boxShadow = `0 0 0 3px ${accent}22`
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = ''
          e.currentTarget.style.boxShadow = ''
        }}
      />
      <p className="mt-2 text-xs text-dim/70">A rough number is fine — round to whatever you know.</p>
    </div>
  )
}
