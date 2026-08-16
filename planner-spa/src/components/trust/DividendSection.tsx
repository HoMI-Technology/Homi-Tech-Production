import { TrendingDown, TrendingUp } from 'lucide-react'
import { localDividend, verdictLabel } from '@/lib/outcomes'
import { VERDICT_META } from '@/lib/score'
import { useScoreHistory } from '@/store/readiness'

/**
 * "Why waiting works" — the readiness-dividend framework, rendered honestly.
 *
 * Canon (lib/outcomes/calibration.ts) compares two anonymized cohorts: people
 * the compass cleared (READY) vs people it told to wait (NOT_YET / BUILD_FIRST).
 * That aggregate needs a backend this local-only build does not have, so no
 * cohort number is shown — ever. What IS shown, once two re-checks exist, is
 * the user's own trajectory from this device's score history.
 */
export default function DividendSection() {
  const history = useScoreHistory()
  const dividend = localDividend(history)

  return (
    <div className="mt-10 max-w-2xl">
      <p className="text-label">Why waiting works</p>
      <h2 className="mt-3 font-serif text-[24px] italic leading-snug text-light md:text-[28px]">
        The readiness dividend
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-dim">
        HōMI tracks two cohorts over time: the people the compass cleared — READY — and the people
        it told to wait. Thirty, ninety, and three hundred sixty-five days later, both are asked
        how the decision actually went. That is the readiness dividend: what waiting, when waiting
        is the answer, is worth.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-dim">
        {VERDICT_META.NOT_YET.line}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-dim">
        The cohort comparison runs on anonymized outcome surveys across many households — it needs
        a server, and this build is local-only. So there is no cohort number here. We would rather
        show you nothing than a statistic we cannot stand behind.
      </p>

      {dividend ? (
        <div className="card-chrome mt-5 p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.06] bg-slate/80">
              {dividend.delta >= 0 ? (
                <TrendingUp size={15} className="text-emerald" />
              ) : (
                <TrendingDown size={15} className="text-amber" />
              )}
            </span>
            <h3 className="text-sm font-semibold text-light">Your dividend so far</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-dim">
            <span className="font-display text-light tnum">{dividend.checks}</span> re-checks on
            this device. First check{' '}
            <span className="font-display text-light tnum">
              {new Date(dividend.first.at).toLocaleDateString()}
            </span>{' '}
            read{' '}
            <span className="font-display text-light tnum">
              {verdictLabel(dividend.first.verdict)}
            </span>{' '}
            (<span className="capitalize">{dividend.firstBand}</span> band). Latest reads{' '}
            <span className="font-display text-light tnum">
              {verdictLabel(dividend.latest.verdict)}
            </span>{' '}
            (<span className="capitalize">{dividend.latestBand}</span> band).
          </p>
          <p className="mt-2 text-sm leading-relaxed text-dim">
            Score movement:{' '}
            <span
              className={`font-display tnum ${dividend.delta >= 0 ? 'text-emerald' : 'text-amber'}`}
            >
              {dividend.delta >= 0 ? '+' : ''}
              {dividend.delta.toFixed(1)}
            </span>{' '}
            {dividend.bandMovement === 'up'
              ? '— up a band.'
              : dividend.bandMovement === 'down'
                ? '— down a band.'
                : '— same band.'}{' '}
            This is your own history, nothing aggregated.
          </p>
        </div>
      ) : (
        <div className="card-chrome mt-5 p-6">
          <h3 className="text-sm font-semibold text-light">Your dividend so far</h3>
          <p className="mt-3 text-sm leading-relaxed text-dim">
            Re-check your readiness as your numbers change. From the second check on, this card
            shows your own trajectory — first read vs latest, straight from this device. Nothing
            estimated, nothing invented.
          </p>
        </div>
      )}
    </div>
  )
}
