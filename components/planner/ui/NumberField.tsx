"use client";

/** Labeled numeric input — score mono numerals. */
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-dim">{label}</span>
      <span className="flex items-center gap-1.5 rounded-xl border border-line bg-navy/40 px-3 py-2 transition-colors focus-within:border-cyan/40">
        {prefix && <span className="font-score text-sm text-dim">{prefix}</span>}
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent font-score text-sm font-medium text-light outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix && (
          <span className="shrink-0 font-score text-sm text-dim">{suffix}</span>
        )}
      </span>
    </label>
  );
}
