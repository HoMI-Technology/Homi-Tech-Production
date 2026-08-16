import { Link } from 'react-router-dom'
import { ArrowRight, Compass } from 'lucide-react'
import { useBuildPath } from '@/store/buildpath'
import { useScoreHistory } from '@/store/readiness'
import { VERDICT_META } from '@/lib/score'

const WEEK_MS = 7 * 86_400_000

function fmtDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/**
 * Section 5 — Cadence (M8), anchor id="cadence".
 *
 * SINGLE SOURCE OF TRUTH: "last bearing" comes from the readiness store's
 * score history (useScoreHistory — real recorded snapshots). The buildpath
 * store's checks[] is kept only as a pre-history fallback and to record
 * re-check intent. Do not reintroduce a parallel bearing source here.
 */
export default function CadenceCard() {
  const { state, recordCheck } = useBuildPath()
  const history = useScoreHistory()

  const lastSnapshot = history.length > 0 ? history[history.length - 1] : null
  const last = lastSnapshot?.at ?? state.checks[0]
  const nextLabel = last ? fmtDay(new Date(new Date(last).getTime() + WEEK_MS).toISOString()) : null
  const recentSnapshots = history.slice(-3).reverse()
  const recentChecks = state.checks.slice(0, 3)

  return (
    <section id="cadence" aria-label="Your bearing check" className="scroll-mt-24">
      <h2 className="text-label">Cadence</h2>

      <div className="card-chrome card-hairline-top mt-4 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan/10 text-cyan-300">
                <Compass size={16} />
              </span>
              <h3 className="text-sm font-semibold text-light">Your bearing check</h3>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-dim">
              HōMI doesn't ping you daily. Money doesn't move that fast, and neither should you.
              Re-check weekly, or when something real changes — income, debt, savings, or how you
              feel.
            </p>
          </div>

          <div className="shrink-0 sm:text-right">
            <p className="text-label">Next re-score</p>
            <p className="mt-1 font-display text-lg font-semibold text-cyan-300 tnum">
              {nextLabel ?? 'after your first week'}
            </p>
            <Link
              to="/readiness"
              onClick={recordCheck}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-glow-cyan transition-transform hover:scale-[1.02] active:scale-[0.97]"
            >
              Re-check now
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {recentSnapshots.length > 0 ? (
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <p className="text-label">Recent re-checks</p>
            <div className="mt-2 divide-y divide-white/[0.06]">
              {recentSnapshots.map((snap) => (
                <div key={snap.at} className="flex items-center justify-between py-2">
                  <span className="text-xs text-dim">
                    {fmtDay(snap.at)} · {snap.score.toFixed(1)} · {VERDICT_META[snap.verdict].label}
                  </span>
                  <span className="font-display text-[12px] text-light tnum">{snap.score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : recentChecks.length > 0 && (
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <p className="text-label">Recent re-checks</p>
            <div className="mt-2 divide-y divide-white/[0.06]">
              {recentChecks.map((iso) => (
                <div key={iso} className="flex items-center justify-between py-2">
                  <span className="text-xs text-dim">Bearing check</span>
                  <span className="font-display text-[12px] text-light tnum">{fmtDay(iso)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
