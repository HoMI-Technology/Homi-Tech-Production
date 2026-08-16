import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Question-bank style 1–10 slider: dark custom track, cyan thumb with glow,
 * value bubble above the thumb while dragging (design/readiness.md §Motion).
 */
export default function ReadinessSlider({
  label,
  value,
  onChange,
  minLabel = 'Low',
  maxLabel = 'High',
  accent = '#22d3ee',
  disabled = false,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  minLabel?: string
  maxLabel?: string
  accent?: string
  disabled?: boolean
}) {
  const [dragging, setDragging] = useState(false)
  const frac = (value - 1) / 9

  return (
    <div className={cn(disabled && 'pointer-events-none opacity-40')}>
      <style>{`
        .homi-range { -webkit-appearance: none; appearance: none; width: 100%; height: 22px; background: transparent; cursor: pointer; }
        .homi-range:focus { outline: none; }
        .homi-range::-webkit-slider-runnable-track { height: 4px; border-radius: 999px; background: var(--homi-track, rgba(255,255,255,0.06)); }
        .homi-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 15px; height: 15px; border-radius: 999px; background: var(--homi-accent, #22d3ee); border: none; margin-top: -5.5px; box-shadow: 0 0 10px var(--homi-glow, rgba(34,211,238,0.55)); }
        .homi-range::-moz-range-track { height: 4px; border-radius: 999px; background: rgba(255,255,255,0.06); }
        .homi-range::-moz-range-progress { height: 4px; border-radius: 999px; background: var(--homi-accent, #22d3ee); }
        .homi-range::-moz-range-thumb { width: 15px; height: 15px; border-radius: 999px; background: var(--homi-accent, #22d3ee); border: none; box-shadow: 0 0 10px var(--homi-glow, rgba(34,211,238,0.55)); }
      `}</style>

      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-light">{label}</span>
        <span className="text-data-sm text-dim">{value} / 10</span>
      </div>

      <div className="relative mt-1.5">
        {/* value bubble while dragging */}
        {dragging && (
          <span
            className="pointer-events-none absolute -top-7 z-10 -translate-x-1/2 rounded-md bg-navyLight px-2 py-0.5 text-[11px] font-semibold text-light shadow-lg ring-1 ring-white/10"
            style={{ left: `${frac * 100}%` }}
          >
            {value}
          </span>
        )}
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={() => setDragging(true)}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onBlur={() => setDragging(false)}
          className="homi-range"
          style={
            {
              '--homi-accent': accent,
              '--homi-glow': `${accent}8c`,
              '--homi-track': `linear-gradient(90deg, ${accent} ${frac * 100}%, rgba(255,255,255,0.06) ${frac * 100}%)`,
            } as React.CSSProperties
          }
        />
      </div>
      <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-dim/70">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}
