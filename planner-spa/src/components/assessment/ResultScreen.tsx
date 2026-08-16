import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Compass, Map } from 'lucide-react'
import AnimatedNumber from '@/components/AnimatedNumber'
import PillarBreakdown from '@/components/readiness/PillarBreakdown'
import { HardStopBanner, WarningsBanner } from '@/components/readiness/Banners'
import { VERDICT_HEX } from '@/components/readiness/ThresholdCompass'
import { VERDICT_META } from '@/lib/score'
import type { ScoreResult } from '@/lib/score'

/**
 * Shared result screen for the full assessment and the Shadow Score.
 * Score in JetBrains Mono, canon verdict chip (VERDICT_HEX), pillar bars,
 * hard-stop banner with verbatim protective copy.
 */
export default function ResultScreen({ result, kind }: { result: ScoreResult; kind: 'full' | 'shadow' }) {
  const hex = VERDICT_HEX[result.verdict]
  const meta = VERDICT_META[result.verdict]

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-2xl flex-col gap-6"
    >
      <div className="card-chrome flex flex-col items-center p-8 text-center">
        {kind === 'shadow' ? (
          <span className="text-label">Shadow Score</span>
        ) : (
          <span className="text-label">Your HōMI Score</span>
        )}

        <AnimatedNumber
          value={result.score}
          format={(n) => n.toFixed(1)}
          className="mt-4 font-display text-6xl font-bold tabular-nums leading-none text-light sm:text-7xl"
        />
        <span className="mt-1 font-display text-sm tabular-nums text-dim">/ 100</span>

        {/* verdict chip — canon colors only */}
        <motion.span
          key={result.verdict}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-[0.14em]"
          style={{ color: hex, borderColor: `${hex}66`, backgroundColor: `${hex}14`, boxShadow: `0 0 18px ${hex}33` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: hex }} />
          {meta.label}
        </motion.span>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-dim">{meta.line}</p>

        {kind === 'shadow' && (
          <p className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-xs leading-relaxed text-dim">
            A first read, not the full picture — six questions in, thirty-nine to go.
          </p>
        )}
      </div>

      <HardStopBanner result={result} />
      <WarningsBanner result={result} />

      <PillarBreakdown result={result} />

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {kind === 'shadow' ? (
          <Link
            to="/assessment"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan px-6 py-3 text-sm font-semibold text-navy shadow-glow-cyan transition-transform hover:scale-[1.02]"
          >
            Take the full assessment
            <ArrowRight size={16} />
          </Link>
        ) : (
          <>
            <Link
              to="/readiness"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan px-6 py-3 text-sm font-semibold text-navy shadow-glow-cyan transition-transform hover:scale-[1.02]"
            >
              <Compass size={16} />
              See your full readiness
            </Link>
            <Link
              to="/buildpath"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald/40 bg-emerald/10 px-6 py-3 text-sm font-semibold text-emerald transition-colors hover:bg-emerald/15"
            >
              <Map size={16} />
              Enter the Build Path
            </Link>
          </>
        )}
      </div>
    </motion.div>
  )
}
