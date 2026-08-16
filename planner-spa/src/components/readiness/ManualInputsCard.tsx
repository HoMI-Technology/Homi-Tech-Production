import { motion } from 'framer-motion'
import { useReadinessManual } from '@/store/readiness'
import { cn } from '@/lib/utils'
import ReadinessSlider from '@/components/readiness/ReadinessSlider'

const CREDIT_OPTIONS = [
  { value: 780, label: 'Excellent — 760+' },
  { value: 720, label: 'Good — 700–759' },
  { value: 680, label: 'Fair — 660–699' },
  { value: 640, label: 'Poor — 620–659' },
  { value: 600, label: 'Below 620 — red line' },
]

const HORIZON_OPTIONS = [
  { value: 2, label: '0–3 months' },
  { value: 4, label: '3–6 months' },
  { value: 9, label: '6–12 months' },
  { value: 18, label: '12+ months' },
]

/** FOMO fill shifts with temperature — low pressure is good (inverted). */
function fomoAccent(level: number): string {
  if (level <= 3) return '#34d399'
  if (level <= 6) return '#facc15'
  if (level <= 8) return '#fab633'
  return '#f24822'
}

const selectClass =
  'w-full appearance-none rounded-xl border border-white/[0.08] bg-slate px-3 py-2 text-sm text-light outline-none transition-colors focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/50'

/**
 * "From you" card — manual assessment inputs persisted to localStorage
 * (design/readiness.md §5 right card). Every change recomputes live.
 */
export default function ManualInputsCard() {
  const { manual, updateManual } = useReadinessManual()
  const solo = manual.partnerAlignment === null

  return (
    <div className="card-chrome flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="text-label">From you</span>
        <span className="text-label !text-[9px]">Saved on this device</span>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {/* credit + horizon */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-label !text-[9px]">Credit score</span>
            <select
              value={manual.creditScore}
              onChange={(e) => updateManual({ creditScore: Number(e.target.value) })}
              className={cn(selectClass, 'mt-1.5')}
            >
              {CREDIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[10px] text-dim/80">Below 620 trips a red line.</span>
          </label>

          <label className="block">
            <span className="text-label !text-[9px]">Time horizon</span>
            <select
              value={manual.timeHorizonMonths}
              onChange={(e) => updateManual({ timeHorizonMonths: Number(e.target.value) })}
              className={cn(selectClass, 'mt-1.5')}
            >
              {HORIZON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[10px] text-dim/80">When you hope to buy.</span>
          </label>
        </div>

        {/* monthly housing ratio (optional) */}
        <label className="block">
          <span className="text-label !text-[9px]">Monthly housing ratio — optional</span>
          <div className="relative mt-1.5">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              placeholder="e.g. 32"
              value={
                manual.monthlyHousingRatio === undefined
                  ? ''
                  : String(Math.round(manual.monthlyHousingRatio * 1000) / 10)
              }
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') {
                  updateManual({ monthlyHousingRatio: undefined })
                  return
                }
                const pct = Number(raw)
                if (!Number.isFinite(pct)) return
                updateManual({ monthlyHousingRatio: Math.min(1, Math.max(0, pct / 100)) })
              }}
              className={cn(selectClass, 'pr-8')}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-dim">%</span>
          </div>
          <span className="mt-1 block text-[10px] text-dim/80">
            The home payment you are considering, as a share of monthly income.
          </span>
        </label>

        {/* sliders */}
        <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-4">
          <ReadinessSlider
            label="Life stability"
            value={manual.lifeStability}
            onChange={(v) => updateManual({ lifeStability: v })}
            minLabel="In flux"
            maxLabel="Rock solid"
          />
          <ReadinessSlider
            label="Confidence"
            value={manual.confidenceLevel}
            onChange={(v) => updateManual({ confidenceLevel: v })}
            minLabel="Unsure"
            maxLabel="Certain"
          />
          <ReadinessSlider
            label="External pressure / FOMO"
            value={manual.fomoLevel}
            onChange={(v) => updateManual({ fomoLevel: v })}
            minLabel="None"
            maxLabel="Overwhelming"
            accent={fomoAccent(manual.fomoLevel)}
          />

          {/* partner alignment + solo toggle */}
          <div>
            <ReadinessSlider
              label="Partner alignment"
              value={manual.partnerAlignment ?? 7}
              onChange={(v) => updateManual({ partnerAlignment: v })}
              minLabel="Not aligned"
              maxLabel="Fully aligned"
              disabled={solo}
            />
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                role="switch"
                aria-checked={solo}
                onClick={() => updateManual({ partnerAlignment: solo ? 7 : null })}
                className="flex items-center gap-2 text-xs font-medium text-dim transition-colors hover:text-light"
              >
                <motion.span
                  className={cn(
                    'relative flex h-5 w-9 items-center rounded-full px-0.5 transition-colors',
                    solo ? 'bg-cyan/70' : 'bg-white/[0.1]',
                  )}
                >
                  <motion.span
                    layout
                    className="h-4 w-4 rounded-full bg-light shadow"
                    style={{ marginLeft: solo ? 'auto' : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                </motion.span>
                I’m doing this solo
              </button>
            </div>
            {solo && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 text-[11px] font-medium text-emerald"
              >
                Solo mode — partner points redistributed.
              </motion.p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
