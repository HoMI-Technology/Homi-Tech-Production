"use client";

/** A row of selectable choice cards (single-select), keyboard/click friendly. */
export function ChoiceCards<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string; sublabel?: string }[];
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
              onClick={() => onChange(opt.value)}
              className={`glass glass-hover rounded-xl border px-4 py-3 text-left transition-colors ${
                active ? "border-cyan" : "border-transparent"
              }`}
              style={active ? { boxShadow: "0 0 0 1px rgba(34,211,238,0.4)" } : undefined}
              aria-pressed={active}
            >
              <span className={`block text-sm font-semibold ${active ? "text-cyan" : "text-light"}`}>
                {opt.label}
              </span>
              {opt.sublabel && <span className="mt-1 block text-xs text-dim">{opt.sublabel}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
