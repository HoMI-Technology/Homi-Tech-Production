"use client";

import { useId } from "react";
import { sliderFillPercent } from "@/lib/assessment/format";

/**
 * A .homi-slider range input with live value, label, and low/high hints.
 * Arrow keys adjust natively via the input; Enter is handled by the parent step.
 */
export function SliderField({
  label,
  hint,
  value,
  min = 1,
  max = 10,
  step = 1,
  lowLabel,
  highLabel,
  color = "#22d3ee",
  formatValue,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  lowLabel?: string;
  highLabel?: string;
  color?: string;
  formatValue?: (v: number) => string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const fill = sliderFillPercent(value, min, max);
  const display = formatValue ? formatValue(value) : String(value);

  return (
    <div className="w-full">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-base font-medium text-light">
          {label}
        </label>
        <span
          className="score-numeral rounded-lg px-3 py-1 text-lg font-bold"
          style={{ color, background: `${color}1a` }}
        >
          {display}
        </span>
      </div>
      {hint && <p className="mb-3 text-sm text-dim">{hint}</p>}
      <input
        id={id}
        type="range"
        className="homi-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ["--fill" as string]: `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={display}
      />
      {(lowLabel || highLabel) && (
        <div className="mt-2 flex justify-between text-xs text-dim">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}
