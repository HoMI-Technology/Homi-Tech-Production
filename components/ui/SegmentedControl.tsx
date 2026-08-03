"use client";

import { useRef } from "react";
import Link from "next/link";

/**
 * Canonical single-select switcher — the one selected-state style for the
 * app's mode toggles (persona chips, agent modes, check-in picks, voices).
 *
 * Semantics: a `radiogroup` of `role="radio"` buttons, not aria-pressed
 * toggles. These switchers are all exclusive single-select ("exactly one
 * mode is active"), which is precisely what radio semantics announce —
 * aria-pressed implies independently toggleable buttons. Roving tabindex
 * with Arrow-key movement (wrapping, skipping disabled options) matches
 * the native radio pattern; selection follows focus.
 *
 * Selected style is the on-token brand lock: cyan (or a constrained brand
 * accent) at /40 border + /10 wash + full-strength text. No raw hex —
 * accents are limited to existing DESIGN.md tokens via `SegmentedAccent`.
 */

export type SegmentedAccent = "cyan" | "emerald" | "yellow" | "light" | "crimson";

/** Full literal class strings so Tailwind sees every accent variant. */
const ACCENT_SELECTED: Record<SegmentedAccent, string> = {
  cyan: "border-cyan/40 bg-cyan/10 text-cyan",
  emerald: "border-emerald/40 bg-emerald/10 text-emerald",
  yellow: "border-yellow/40 bg-yellow/10 text-yellow",
  light: "border-light/40 bg-light/10 text-light",
  crimson: "border-crimson/40 bg-crimson/10 text-crimson",
};

const UNSELECTED = "border-slate-high/60 text-dim hover:border-cyan/30 hover:text-light";

const BASE =
  "border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-50";

type SegmentedVariant = "chip" | "compact" | "card";

const VARIANT_ITEM: Record<SegmentedVariant, string> = {
  /** Standard pill chip (daily check-in scale). */
  chip: "rounded-full px-3 py-1.5 text-sm font-medium",
  /** Dense pill for tight chrome (persona switchers, chat headers). */
  compact: "rounded-full px-2.5 py-1 text-xs font-medium",
  /** Grid card (voices mode grid). */
  card: "rounded-xl px-4 py-3 text-left text-sm font-medium",
};

/**
 * The canonical selection classes on their own — for the rare surface that
 * is a genuine toggle (e.g. multi-select "compare" buttons) and therefore
 * must keep aria-pressed semantics but should share the selected look.
 */
export function segmentedSelectionClasses(
  selected: boolean,
  accent: SegmentedAccent = "cyan",
): string {
  return `${BASE} ${selected ? ACCENT_SELECTED[accent] : UNSELECTED}`;
}

/**
 * Constrained brand-hex → accent mapping. Lets registries that carry a
 * brand hex (e.g. lib/advisor/personas PERSONAS[].color) keep per-item
 * color without inline style maps — anything off-token falls back to cyan.
 */
const HEX_ACCENT: Record<string, SegmentedAccent> = {
  "#22d3ee": "cyan",
  "#34d399": "emerald",
  "#facc15": "yellow",
  "#e2e8f0": "light",
  "#f24822": "crimson",
};

export function accentFromBrandHex(hex: string): SegmentedAccent {
  return HEX_ACCENT[hex.toLowerCase()] ?? "cyan";
}

export interface SegmentedOption<K extends string = string> {
  value: K;
  label: string;
  accent?: SegmentedAccent;
  disabled?: boolean;
}

interface SegmentedControlProps<K extends string> {
  options: readonly SegmentedOption<K>[];
  /** null = nothing selected yet (e.g. an unanswered pick). */
  value: K | null;
  onChange: (value: K) => void;
  ariaLabel: string;
  variant?: SegmentedVariant;
  /** Container layout — defaults to a wrapping chip row. */
  className?: string;
}

export function SegmentedControl<K extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  variant = "chip",
  className = "flex flex-wrap gap-2",
}: SegmentedControlProps<K>) {
  const buttonRefs = useRef(new Map<K, HTMLButtonElement>());

  const selectedIndex = options.findIndex((o) => o.value === value);
  const firstEnabled = options.findIndex((o) => !o.disabled);
  // Roving tabindex: the checked radio is tabbable; with nothing checked,
  // the first enabled option is (native radio behavior).
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : firstEnabled;

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
    <div role="radiogroup" aria-label={ariaLabel} className={className}>
      {options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              if (el) buttonRefs.current.set(opt.value, el);
              else buttonRefs.current.delete(opt.value);
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={opt.disabled}
            tabIndex={i === tabbableIndex ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`${VARIANT_ITEM[variant]} ${segmentedSelectionClasses(selected, opt.accent)}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Link-mode sibling for switchers that are really navigation (URL-driven
 * ranges, query-param views). Renders real links with `aria-current` —
 * never fake tab/radio roles on navigation.
 */
export interface SegmentedLinkOption<K extends string = string> {
  value: K;
  label: string;
  href: string;
}

export function SegmentedLinkNav<K extends string>({
  options,
  value,
  ariaLabel,
  className = "",
}: {
  options: readonly SegmentedLinkOption<K>[];
  value: K;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-0.5 rounded-lg border border-slate-surface/70 bg-navy-light/60 p-0.5 ${className}`.trim()}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Link
            key={opt.value}
            href={opt.href}
            aria-current={active ? "true" : undefined}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan ${
              active ? "bg-cyan/10 text-cyan" : "text-dim hover:text-light"
            }`}
          >
            {opt.label}
          </Link>
        );
      })}
    </nav>
  );
}
