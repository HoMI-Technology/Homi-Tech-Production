"use client";

import { sliderFillPercent } from "@/lib/assessment/format";

interface PercentSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

/** A % suffixed range slider with a live value readout. */
export function PercentSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 12,
  step = 0.1,
}: PercentSliderProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-light">{label}</span>
        <span className="score-numeral text-sm text-cyan">{value.toFixed(1)}%</span>
      </div>
      <input
        type="range"
        className="homi-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${sliderFillPercent(value, min, max)}%` }}
      />
    </label>
  );
}
