import { cn } from '@/lib/utils'

/**
 * Genome 1–7 agree/disagree slider — dark custom track, glowing thumb in the
 * dimension's rotation color. Same visual language as the readiness sliders,
 * on the canon's 7-point scale (1 = left label, 7 = right label).
 */
export default function GenomeSlider({
  id,
  value,
  onChange,
  leftLabel,
  rightLabel,
  accent = '#22d3ee',
}: {
  id: string
  value: number | undefined
  onChange: (v: number) => void
  leftLabel: string
  rightLabel: string
  accent?: string
}) {
  const shown = value ?? 4
  const frac = (shown - 1) / 6

  return (
    <div className={cn(value === undefined && 'opacity-70')}>
      <style>{`
        .genome-range { -webkit-appearance: none; appearance: none; width: 100%; height: 22px; background: transparent; cursor: pointer; }
        .genome-range:focus { outline: none; }
        .genome-range::-webkit-slider-runnable-track { height: 4px; border-radius: 999px; background: var(--genome-track, rgba(255,255,255,0.06)); }
        .genome-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 15px; height: 15px; border-radius: 999px; background: var(--genome-accent, #22d3ee); border: none; margin-top: -5.5px; box-shadow: 0 0 10px var(--genome-glow, rgba(34,211,238,0.55)); }
        .genome-range::-moz-range-track { height: 4px; border-radius: 999px; background: rgba(255,255,255,0.06); }
        .genome-range::-moz-range-progress { height: 4px; border-radius: 999px; background: var(--genome-accent, #22d3ee); }
        .genome-range::-moz-range-thumb { width: 15px; height: 15px; border-radius: 999px; background: var(--genome-accent, #22d3ee); border: none; box-shadow: 0 0 10px var(--genome-glow, rgba(34,211,238,0.55)); }
      `}</style>

      <div className="relative">
        <input
          id={id}
          type="range"
          min={1}
          max={7}
          step={1}
          value={shown}
          aria-valuetext={value === undefined ? 'Not answered yet' : `${shown} of 7`}
          onChange={(e) => onChange(Number(e.target.value))}
          className="genome-range"
          style={
            {
              '--genome-accent': accent,
              '--genome-glow': `${accent}8c`,
              '--genome-track': `linear-gradient(90deg, ${accent} ${frac * 100}%, rgba(255,255,255,0.06) ${frac * 100}%)`,
            } as React.CSSProperties
          }
        />
      </div>
      <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-dim/70">
        <span>{leftLabel}</span>
        <span className="text-data-sm text-dim">
          {value === undefined ? '—' : `${shown} / 7`}
        </span>
        <span>{rightLabel}</span>
      </div>
    </div>
  )
}
