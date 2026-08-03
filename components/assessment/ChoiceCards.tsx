"use client";

/**
 * A grid of selectable choice cards (single-select), keyboard/click friendly.
 * The single implementation for assessment choice grids — the decision-type
 * step and both conflict steps render through it (no duplicated card markup).
 * Selected ring is the on-token `ring-cyan/40` utility, not an inline shadow.
 */
export function ChoiceCards<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: {
    value: T;
    label: string;
    sublabel?: string;
    disabled?: boolean;
    /** Small uppercase tag rendered beside the label (e.g. "Coming soon"). */
    badge?: string;
  }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className="w-full">
      <p className="mb-2 text-base font-medium text-light">{label}</p>
      {hint && <p className="mb-3 text-sm text-dim">{hint}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => !opt.disabled && onChange(opt.value)}
              className={`glass rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan ${
                opt.disabled ? "cursor-not-allowed opacity-50" : "glass-hover"
              } ${active ? "border-cyan ring-1 ring-cyan/40" : "border-transparent"}`}
              aria-pressed={active}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`block text-sm font-semibold ${active ? "text-cyan" : "text-light"}`}>
                  {opt.label}
                </span>
                {opt.badge && (
                  <span className="rounded-full bg-slate-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-dim">
                    {opt.badge}
                  </span>
                )}
              </span>
              {opt.sublabel && <span className="mt-1 block text-xs text-dim">{opt.sublabel}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
