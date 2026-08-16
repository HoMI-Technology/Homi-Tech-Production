import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import '@/styles/print.css'
import { PILLARS, VERDICT_META } from '@/lib/score'
import type { PillarKey, VerdictKey } from '@/lib/score'
import { useConfidence } from '@/lib/confidence'
import { useBudget } from '@/store/budget'
import { useAssessmentResult } from '@/store/readiness'
import CompassMark from '@/components/trust/CompassMark'
import { useAuditRows } from '@/components/trust/audit'
import { LEGAL_DISCLAIMER, NON_POSITIONING } from '@/components/trust/legal'

/** Canon verdict colors (trademark-pending — exact, no substitutes). */
const VERDICT_HEX: Record<VerdictKey, string> = {
  READY: '#34d399',
  ALMOST_THERE: '#facc15',
  BUILD_FIRST: '#fab633',
  NOT_YET: '#f24822', // DO NOT PROCEED
}

const PILLAR_ORDER: PillarKey[] = ['financial', 'emotional', 'timing']

const PILLAR_CLASS: Record<PillarKey, string> = {
  financial: 'pillar-fin',
  emotional: 'pillar-emo',
  timing: 'pillar-tim',
}

const SOURCE_SHORT = { computed: 'ledger', self: 'you', default: 'default' } as const

/**
 * Printable readiness report (M10) — brand-safe sheet with the compass
 * mark, verdict, pillar math, confidence line, inputs appendix, and the
 * verbatim legal footer. Print styles live in src/styles/print.css.
 */
export default function Report() {
  const result = useAssessmentResult()
  const confidence = useConfidence()
  const rows = useAuditRows()
  const { state } = useBudget()

  const meta = VERDICT_META[result.verdict]
  const hex = VERDICT_HEX[result.verdict]
  const fresh = confidence.factors.find((f) => f.key === 'freshness')?.ok ?? false
  const levelLabel = confidence.level.charAt(0).toUpperCase() + confidence.level.slice(1)
  const generated = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="report-root flex justify-center">
      <div className="report-sheet report-ink w-full max-w-[760px] rounded-[32px] border report-hairline p-8 md:p-10">
        {/* header — compass mark + locked wordmark */}
        <header className="report-card flex items-center gap-5">
          <CompassMark size={64} />
          <div>
            <p className="font-sans text-[20px] font-black tracking-[-0.02em]">
              <span className="report-cyan">H</span>
              <span style={{ color: '#34d399' }}>ō</span>
              <span style={{ color: '#facc15' }}>M</span>
              <span className="report-cyan">I</span>
            </p>
            <p className="report-ink-dim mt-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
              Decision Readiness Intelligence&trade;
            </p>
          </div>
        </header>

        {/* verdict block */}
        <section className="report-card mt-8 border-t report-hairline pt-8">
          <p className="report-ink-dim text-[11px] font-semibold uppercase tracking-[0.12em]">
            HōMI-Score
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-3">
            <span className="font-display text-[56px] font-semibold leading-none tnum">
              {result.score.toFixed(1)}
            </span>
            <span
              className="mb-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ backgroundColor: `${hex}1a`, color: hex }}
            >
              {meta.label}
            </span>
          </div>
          <p className="report-ink-dim mt-3 font-serif text-[17px] italic">{meta.line}</p>
        </section>

        {/* pillar rows */}
        <section className="report-card mt-8 flex flex-col gap-5">
          {PILLAR_ORDER.map((key) => {
            const pillar = result.pillars[key]
            const pct = pillar.max > 0 ? (pillar.total / pillar.max) * 100 : 0
            return (
              <div key={key}>
                <div className="flex items-baseline justify-between">
                  <span className={`text-[13px] font-semibold ${PILLAR_CLASS[key]}`}>
                    {PILLARS[key].label}
                  </span>
                  <span className="font-display text-[13px] tnum">
                    {pillar.total}/{pillar.max}
                  </span>
                </div>
                <div className="report-track mt-2 h-1 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full ${PILLAR_CLASS[key]}`}
                    style={{ width: `${pct}%`, backgroundColor: 'currentColor' }}
                  />
                </div>
              </div>
            )
          })}
        </section>

        {/* the math — every factor, points over max */}
        <section className="report-card mt-8 border-t report-hairline pt-6">
          <p className="report-ink-dim text-[11px] font-semibold uppercase tracking-[0.12em]">
            The math
          </p>
          <div className="mt-3 grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-3">
            {PILLAR_ORDER.map((key) => {
              const pillar = result.pillars[key]
              return (
                <div key={key}>
                  <div className="flex items-baseline justify-between border-b report-hairline pb-1.5">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${PILLAR_CLASS[key]}`}
                    >
                      {PILLARS[key].label}
                    </span>
                    <span className="font-display text-[11px] tnum">
                      {pillar.total}/{pillar.max}
                    </span>
                  </div>
                  {pillar.factors.map((f) => (
                    <div key={f.key} className="flex items-baseline justify-between py-1">
                      <span className="report-ink-dim text-[12px]">{f.label}</span>
                      <span className="font-display text-[12px] tnum">
                        {f.pts}/{f.max}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </section>

        {/* confidence line */}
        <p className="report-ink-dim report-card mt-6 text-[12px]">
          Confidence: {levelLabel} — {state.transactions.length}{' '}
          {state.transactions.length === 1 ? 'entry' : 'entries'},{' '}
          {fresh ? 'fresh data.' : 'data needs a refresh.'}
        </p>

        {/* inputs appendix — compact audit rows */}
        <section className="report-card mt-8 border-t report-hairline pt-6">
          <p className="report-ink-dim text-[11px] font-semibold uppercase tracking-[0.12em]">
            Inputs appendix
          </p>
          <div className="mt-3 grid grid-cols-1 gap-x-10 md:grid-cols-2">
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex items-baseline justify-between gap-3 border-b report-hairline py-1.5"
              >
                <span className="report-ink-dim text-[12px]">{row.label}</span>
                <span className="flex items-baseline gap-2">
                  <span className="report-ink-dim text-[10px]">{SOURCE_SHORT[row.source]}</span>
                  <span className="font-display text-[12px] tnum">{row.value}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* legal footer — verbatim */}
        <footer className="report-card mt-8 border-t report-hairline pt-5">
          <p className="report-ink-dim text-[9px] leading-relaxed">{LEGAL_DISCLAIMER}</p>
          <p className="report-ink-dim mt-2 text-[9px] leading-relaxed">{NON_POSITIONING}</p>
          <p className="report-ink-dim mt-2 text-[9px] leading-relaxed">
            Generated {generated} &middot; This device &middot; homitechnology.com
          </p>
        </footer>

        {/* actions — screen only */}
        <div className="no-print mt-8 flex flex-wrap items-center gap-3 border-t report-hairline pt-6">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-[0_0_24px_rgba(34,211,238,0.25)] transition-transform hover:scale-[1.02] active:scale-[0.97]"
          >
            <Printer size={15} />
            Print / save as PDF
          </button>
          <Link
            to="/readiness"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2 text-sm font-medium text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
          >
            <ArrowLeft size={15} />
            Back to readiness
          </Link>
        </div>
      </div>
    </div>
  )
}
