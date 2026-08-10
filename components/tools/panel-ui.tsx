/**
 * Shared chrome for the inline lens panels on Money · Decide.
 *
 * Ported from the local planner build. The structure, interaction and copy are
 * identical; the styling is re-expressed in this repo's sanctioned vocabulary
 * because the original used arbitrary pixel text sizes that brand-check N20
 * rejects, plus three utility classes that do not exist here.
 *
 * Two substitutions worth knowing:
 *   local `text-label`   → `.eyebrow`
 *   local `font-display` → `.score-numeral`
 * The second matters: `font-display` is JetBrains Mono in the local build but
 * Fraunces here, so copying it verbatim would render every figure in a serif.
 * `.score-numeral` is the tabular monospace face those numerals actually want.
 */

"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Sparkle } from "lucide-react";

export const EDUCATIONAL_FOOTER = "Educational estimates only — not financial advice.";
export const LENDER_FOOTER = "Illustrative — actual rates and approval are set by lenders.";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Shown when inputs seeded from the user's real money picture. */
export function SeededChip() {
  return (
    <span className="eyebrow inline-flex items-center gap-1.5 rounded-full border border-cyan/25 bg-cyan/[0.08] px-2.5 py-1 text-cyan">
      <Sparkle size={11} aria-hidden />
      Pre-filled from your ledger
    </span>
  );
}

/**
 * Shown when there is no saved money picture. The fields start empty rather
 * than pre-filled with invented figures, so this says what to do, not what the
 * numbers supposedly are.
 */
export function EmptyChip() {
  return (
    <span className="eyebrow inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-dim">
      Enter your numbers
    </span>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow text-dim">{label}</span>
      <span className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 transition-colors focus-within:border-cyan/40">
        {prefix && <span className="score-numeral shrink-0 text-sm text-dim">{prefix}</span>}
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          onChange={(e) => onChange(Number(e.target.value))}
          className="score-numeral w-full bg-transparent text-sm font-medium text-light outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix && <span className="score-numeral shrink-0 text-sm text-dim">{suffix}</span>}
      </span>
    </label>
  );
}

/** Single output stat — dim label over a tabular numeral. */
export function Stat({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <p className="eyebrow text-dim">{label}</p>
      <p
        className="score-numeral type-h4 mt-1.5 text-light"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs leading-snug text-dim">{hint}</p>}
    </div>
  );
}

/** Verdict-style result chip (canon tier language where a lens has tiers). */
export function ResultChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="eyebrow inline-flex items-center gap-1.5 rounded-full px-3 py-1"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  );
}

/** Panel chrome: description, inputs, results, canon disclaimers. */
export function ToolPanel({
  desc,
  seeded,
  lender,
  children,
}: {
  desc: string;
  seeded?: boolean;
  lender?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="glass p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-base italic text-dim">{desc}</p>
        {seeded ? <SeededChip /> : <EmptyChip />}
      </div>
      <div className="mt-5">{children}</div>
      <div className="mt-6 border-t border-white/[0.06] pt-3">
        <p className="text-xs leading-relaxed text-dim/70">{EDUCATIONAL_FOOTER}</p>
        {lender && <p className="mt-0.5 text-xs leading-relaxed text-dim/70">{LENDER_FOOTER}</p>}
      </div>
    </motion.section>
  );
}

export function InputGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{children}</div>;
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{children}</div>;
}
