import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Sparkle } from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Shared chrome for the /tools lens panels                            */
/* ------------------------------------------------------------------ */

export const EDUCATIONAL_FOOTER = 'Educational estimates only — not financial advice.'
export const LENDER_FOOTER = 'Illustrative — actual rates and approval are set by lenders.'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

/** "Pre-filled from your ledger" — shown when inputs seed from the budget store. */
export function SeededChip() {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-cyan/25 bg-cyan/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan">
      <Sparkle size={11} />
      Pre-filled from your ledger
    </span>
  )
}

/** Labeled numeric input — JetBrains Mono numerals, dark chrome. */
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
  step?: number
  min?: number
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label">{label}</span>
      <span className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 transition-colors focus-within:border-cyan/40">
        {prefix && <span className="font-display text-[13px] text-dim">{prefix}</span>}
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent font-display text-[13px] font-medium text-light outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix && <span className="shrink-0 font-display text-[13px] text-dim">{suffix}</span>}
      </span>
    </label>
  )
}

/** Single output stat — dim label over JetBrains Mono value. */
export function Stat({
  label,
  value,
  accent,
  hint,
}: {
  label: string
  value: string
  accent?: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <p className="text-label">{label}</p>
      <p
        className="mt-1.5 font-display text-[17px] font-semibold tracking-[-0.01em] text-light"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-dim">{hint}</p>}
    </div>
  )
}

/** Verdict-style result chip (canon tier language where a tool has tiers). */
export function ResultChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

/** Panel chrome: description, inputs, results, canon disclaimers. */
export function ToolPanel({
  desc,
  seeded,
  lender,
  children,
}: {
  desc: string
  seeded?: boolean
  lender?: boolean
  children: ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="card-chrome card-hairline-top p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-serif text-[16px] italic text-dim">{desc}</p>
        {seeded && <SeededChip />}
      </div>
      <div className="mt-5">{children}</div>
      <div className="mt-6 border-t border-white/[0.06] pt-3">
        <p className="text-[11px] leading-relaxed text-dim/70">{EDUCATIONAL_FOOTER}</p>
        {lender && <p className="mt-0.5 text-[11px] leading-relaxed text-dim/70">{LENDER_FOOTER}</p>}
      </div>
    </motion.section>
  )
}

/** Grid wrapper for input fields. */
export function InputGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{children}</div>
}

/** Grid wrapper for output stats. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{children}</div>
}
