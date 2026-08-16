import type { ReactNode } from 'react'
import type { VerdictKey } from '@/lib/score'
import { VERDICT_META } from '@/lib/score'

/* ------------------------------------------------------------------ */
/* Shared chrome for the Plan tab (PLAN LAB) sub-panels.               */
/*                                                                     */
/* Verdict chips always render the canon four-tier VERDICT_META        */
/* labels — the reference planner's 75/55 three-tier vocabulary was    */
/* flagged non-canonical and never surfaces here.                      */
/* ------------------------------------------------------------------ */

const VERDICT_TONE: Record<VerdictKey, string> = {
  READY: 'border-emerald/30 bg-emerald/10 text-emerald',
  ALMOST_THERE: 'border-emerald/30 bg-emerald/10 text-emerald',
  BUILD_FIRST: 'border-amber/30 bg-amber/10 text-amber',
  NOT_YET: 'border-crimson/30 bg-crimson/10 text-crimson',
}

/** Canon verdict chip — label + tone from VERDICT_META, never raw keys. */
export function VerdictChip({ verdict }: { verdict: VerdictKey }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${VERDICT_TONE[verdict]}`}
    >
      ✦ {VERDICT_META[verdict].label}
    </span>
  )
}

/** Sub-panel header: eyebrow + Fraunces italic title + optional right slot. */
export function PlanSectionHeader({
  eyebrow,
  title,
  caption,
  right,
}: {
  eyebrow: string
  title: string
  caption?: string
  right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-label text-cyan">{eyebrow}</p>
        <h3 className="mt-1.5 font-serif text-[22px] italic leading-tight text-light">
          {title}
        </h3>
        {caption && (
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-dim">
            {caption}
          </p>
        )}
      </div>
      {right}
    </div>
  )
}

/** Output tile — dim label over JetBrains Mono value (tools Stat twin). */
export function PlanTile({
  label,
  value,
  tone = 'default',
  hint,
}: {
  label: string
  value: string
  tone?: 'default' | 'cyan' | 'emerald' | 'amber' | 'crimson'
  hint?: string
}) {
  const toneClass =
    tone === 'cyan'
      ? 'text-cyan'
      : tone === 'emerald'
        ? 'text-emerald'
        : tone === 'amber'
          ? 'text-amber'
          : tone === 'crimson'
            ? 'text-crimson'
            : 'text-light'
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <p className="text-label">{label}</p>
      <p
        className={`mt-1.5 font-display text-[17px] font-semibold tracking-[-0.01em] tnum ${toneClass}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-dim">{hint}</p>}
    </div>
  )
}

/** Thin protective footer used across Plan sub-panels. */
export function PlanFooter({ lines }: { lines: string[] }) {
  return (
    <div className="mt-6 border-t border-white/[0.06] pt-3">
      {lines.map((line) => (
        <p key={line} className="mt-0.5 text-[11px] leading-relaxed text-dim/70">
          {line}
        </p>
      ))}
    </div>
  )
}
