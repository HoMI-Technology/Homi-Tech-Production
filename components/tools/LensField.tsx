/**
 * LensField — the shared calculator input for the Decision Lab.
 *
 * Identical interaction to the existing tool sliders, plus the honesty
 * tag: when a value was seeded from the user's saved numbers (CFM), the
 * field says so. Illustrative fallbacks get no tag — the distinction is
 * always visible, never implied.
 */

"use client";

import { formatCurrency } from "@/lib/tools/format";
import { sliderFillPercent } from "@/lib/assessment/format";

export type LensFieldSource = "yours" | "illustrative";

export function LensField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
  source = "illustrative",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: "currency" | "percent" | "years";
  source?: LensFieldSource;
}) {
  const fill = sliderFillPercent(value, min, max);
  const display =
    format === "currency"
      ? formatCurrency(value)
      : format === "percent"
        ? `${value}%`
        : `${value} yrs`;

  return (
    <div className={source === "yours" ? "border-l-2 border-cyan/60 pl-3" : ""}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm text-light">{label}</label>
        <span className="flex items-center gap-2">
          {source === "yours" && (
            <span className="rounded-full border border-cyan/40 px-2 py-0.5 text-3xs font-medium uppercase tracking-wide text-cyan">
              your numbers
            </span>
          )}
          <span className="score-numeral text-sm text-cyan">{display}</span>
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        className="homi-slider mt-2"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${fill}%` }}
      />
    </div>
  );
}
