"use client";

import { useId, useRef } from "react";

/**
 * A grid of selectable choice cards (single-select), keyboard/click friendly.
 * The single implementation for assessment choice grids — the decision-type
 * step and both conflict steps render through it (no duplicated card markup).
 * Selected ring is the on-token `ring-cyan/40` utility, not an inline shadow.
 *
 * Semantics: a `radiogroup` of `role="radio"` cards, not pressed-state
 * toggles — the grid is exclusive single-select ("exactly one answer"),
 * which is precisely what radio semantics announce. Roving tabindex with
 * Arrow-key movement (wrapping, skipping disabled options) mirrors the
 * SegmentedControl pattern; selection follows focus.
 */
export function ChoiceCards<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  layout = "grid",
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
  layout?: "grid" | "stack";
}) {
  const labelId = useId();
  const hintId = useId();
  const buttonRefs = useRef(new Map<T, HTMLButtonElement>());

  const selectedIndex = options.findIndex((o) => o.value === value);
  const firstEnabled = options.findIndex((o) => !o.disabled);
  // Roving tabindex: the checked radio is tabbable; with nothing checked —
  // or the checked option disabled — the first enabled option is (native
  // radio behavior; a disabled button can never carry the group's tab stop).
  const tabbableIndex =
    selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : firstEnabled;

  function move(from: number, dir: 1 | -1) {
    const n = options.length;
    for (let step = 1; step <= n; step++) {
      const i = (from + dir * step + n * step) % n;
      if (!options[i].disabled) {
        const key = options[i].value;
        onChange(key);
        buttonRefs.current.get(key)?.focus();
        return;
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(index, -1);
        break;
      default:
    }
  }

  return (
    <div className="w-full">
      <p
        id={labelId}
        className={
          layout === "stack"
            ? "v4-assess-question mb-5 font-display"
            : "mb-2 text-base font-medium text-light"
        }
      >
        {label}
      </p>
      {hint && (
        <p id={hintId} className="mb-3 text-sm text-dim">
          {hint}
        </p>
      )}
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
        className={
          layout === "stack"
            ? "v4-assess-choices"
            : "grid grid-cols-1 gap-3 sm:grid-cols-2"
        }
      >
        {options.map((opt, i) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                if (el) buttonRefs.current.set(opt.value, el);
                else buttonRefs.current.delete(opt.value);
              }}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={opt.disabled}
              tabIndex={i === tabbableIndex ? 0 : -1}
              onClick={() => !opt.disabled && onChange(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={
                layout === "stack"
                  ? `v4-assess-choice ${active ? "is-selected" : ""} ${
                      opt.disabled ? "is-disabled" : ""
                    }`
                  : `glass rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan ${
                      opt.disabled ? "cursor-not-allowed opacity-50" : "glass-hover"
                    } ${active ? "border-cyan ring-1 ring-cyan/40" : "border-transparent"}`
              }
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  className={`block text-sm font-semibold ${active ? "text-cyan" : "text-light"}`}
                >
                  {opt.label}
                </span>
                {opt.badge && (
                  <span className="rounded-full bg-slate-surface px-2 py-0.5 text-3xs font-medium uppercase tracking-wide text-dim">
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
