"use client";

import { sliderFillPercent } from "@/lib/assessment/format";
import { formatCurrency } from "@/lib/tools/format";

export type CalcFieldSource = "yours" | "illustrative";

/**
 * Shared slider input for the calculator vertical — matches the look of the
 * per-page Field components in the original tools, extracted so new
 * calculators don't each redefine it.
 *
 * Decision Lab: when a value was seeded from the user's saved numbers (CFM),
 * pass source="yours" and the field says so. Illustrative fallbacks get no
 * tag — the distinction is always visible, never implied.
 */
export function CalcField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
  suffix,
  source = "illustrative",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: "currency" | "percent" | "years" | "months" | "number";
  suffix?: string;
  source?: CalcFieldSource;
}) {
  const fill = sliderFillPercent(value, min, max);
  const display =
    format === "currency"
      ? formatCurrency(value)
      : format === "percent"
        ? `${value}%`
        : format === "years"
          ? `${value} yrs`
          : format === "months"
            ? `${value} mo`
            : `${value}${suffix ? ` ${suffix}` : ""}`;

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
          <span className="score-numeral text-sm text-cyan transition-colors duration-200">
            {display}
          </span>
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

/** Shared horizontal metric bar. */
export function CalcBar({
  label,
  value,
  max,
  color,
  display,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  display: string;
}) {
  const pct = Math.max(2, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-dim">{label}</span>
        <span className="score-numeral text-light">{display}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
