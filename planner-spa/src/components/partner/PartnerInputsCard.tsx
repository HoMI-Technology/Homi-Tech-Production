import { usePartner } from '@/store/partner'
import { cn } from '@/lib/utils'
import ReadinessSlider from '@/components/readiness/ReadinessSlider'
import { TEMP_HEX } from '@/store/budget'

const EMERALD = TEMP_HEX.emerald // Partner

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
  if (level <= 3) return TEMP_HEX.emerald
  if (level <= 6) return TEMP_HEX.yellow
  if (level <= 8) return TEMP_HEX.amber
  return TEMP_HEX.crimson
}

const selectClass =
  'w-full appearance-none rounded-xl border border-white/[0.08] bg-slate px-3 py-2 text-sm text-light outline-none transition-colors focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/50'

/**
 * Two full reads — the partner's own mini input set.
 * Same visual patterns as the Readiness "From you" card, but persisted to the
 * partner store and scored as a second, standalone read through the shared
 * engine. Nobody is graded — both reads feed the household view.
 */
export default function PartnerInputsCard() {
  const { partnerInputs, updatePartnerInputs } = usePartner()

  return (
    <div className="card-chrome flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="text-label">Their read</span>
        <span className="text-label !text-[9px]">Saved on this device</span>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {/* credit + horizon */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-label !text-[9px]">Partner credit score</span>
            <select
              value={partnerInputs.creditScore}
              onChange={(e) => updatePartnerInputs({ creditScore: Number(e.target.value) })}
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
            <span className="text-label !text-[9px]">Their time horizon</span>
            <select
              value={partnerInputs.timeHorizonMonths}
              onChange={(e) => updatePartnerInputs({ timeHorizonMonths: Number(e.target.value) })}
              className={cn(selectClass, 'mt-1.5')}
            >
              {HORIZON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[10px] text-dim/80">When they hope to buy.</span>
          </label>
        </div>

        {/* sliders — emerald accent for the partner's read */}
        <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-4">
          <ReadinessSlider
            label="Life stability"
            value={partnerInputs.lifeStability}
            onChange={(v) => updatePartnerInputs({ lifeStability: v })}
            minLabel="In flux"
            maxLabel="Rock solid"
            accent={EMERALD}
          />
          <ReadinessSlider
            label="Confidence"
            value={partnerInputs.confidenceLevel}
            onChange={(v) => updatePartnerInputs({ confidenceLevel: v })}
            minLabel="Unsure"
            maxLabel="Certain"
            accent={EMERALD}
          />
          <ReadinessSlider
            label="External pressure / FOMO"
            value={partnerInputs.fomoLevel}
            onChange={(v) => updatePartnerInputs({ fomoLevel: v })}
            minLabel="None"
            maxLabel="Overwhelming"
            accent={fomoAccent(partnerInputs.fomoLevel)}
          />
        </div>

        <p className="border-t border-white/[0.06] pt-4 text-[11px] leading-relaxed text-dim/80">
          The shared ledger feeds both reads — only these answers are theirs alone.
        </p>
      </div>
    </div>
  )
}
