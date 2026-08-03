"use client";

import { useEffect, useRef } from "react";

/**
 * Canonical tab primitives — seeded from the finance cockpit's tablist
 * (the one a11y-correct bespoke implementation), promoted to a shared
 * component and extended with the roving-tabindex + arrow-key behavior
 * the WAI-ARIA tabs pattern requires.
 *
 * - True `tablist` / `tab` / `tabpanel` semantics with `aria-selected`,
 *   `aria-controls` / `aria-labelledby` wiring via a stable `idPrefix`
 *   (`{idPrefix}-tab-{key}` / `{idPrefix}-panel-{key}`).
 * - Roving tabindex: only the selected tab is in the tab order; Arrow
 *   Left/Right move (with wrap), Home/End jump. Selection follows focus.
 * - Optional `hashSync`: the active tab mirrors into `location.hash`
 *   (replaceState — no history spam), initializes from the hash on mount,
 *   and follows external `hashchange` navigation.
 *
 * Style is the finance underline look — on-token, cyan selected state per
 * the DESIGN.md brand lock. Controlled component: parent owns the value.
 */

export interface TabItem<K extends string = string> {
  key: K;
  label: string;
}

interface TabsProps<K extends string> {
  tabs: readonly TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Stable id prefix for tab/panel ARIA wiring, e.g. "finance". */
  idPrefix: string;
  ariaLabel: string;
  /** Mirror the active tab into location.hash and read it back. */
  hashSync?: boolean;
  className?: string;
}

export function Tabs<K extends string>({
  tabs,
  value,
  onChange,
  idPrefix,
  ariaLabel,
  hashSync = false,
  className = "",
}: TabsProps<K>) {
  const buttonRefs = useRef(new Map<K, HTMLButtonElement>());

  // Latest-refs so the mount-only hash effects never run with stale closures.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  // Initialize from the URL hash, then follow external hashchange navigation.
  useEffect(() => {
    if (!hashSync) return;
    function applyHash() {
      const hash = window.location.hash.replace("#", "");
      if (tabsRef.current.some((t) => t.key === hash)) {
        onChangeRef.current(hash as K);
      }
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [hashSync]);

  // Mirror the active tab into the hash — skip the mount write so a page
  // opened without a hash (or with one, before it has been applied) is not
  // stamped with the default tab.
  const firstWriteRef = useRef(true);
  useEffect(() => {
    if (!hashSync) return;
    if (firstWriteRef.current) {
      firstWriteRef.current = false;
      return;
    }
    window.history.replaceState(null, "", `#${value}`);
  }, [value, hashSync]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    let next: number | null = null;
    switch (e.key) {
      case "ArrowRight":
        next = index === last ? 0 : index + 1;
        break;
      case "ArrowLeft":
        next = index === 0 ? last : index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    const key = tabs[next].key;
    onChange(key);
    buttonRefs.current.get(key)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex flex-wrap gap-1 border-b border-slate-surface/60 pb-px ${className}`.trim()}
    >
      {tabs.map((t, i) => {
        const selected = value === t.key;
        return (
          <button
            key={t.key}
            ref={(el) => {
              if (el) buttonRefs.current.set(t.key, el);
              else buttonRefs.current.delete(t.key);
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${t.key}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${t.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan ${
              selected
                ? "border-b-2 border-cyan bg-slate-surface/40 text-cyan"
                : "text-dim hover:text-light"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** The panel half of the pattern — id-wired to the matching tab. */
export function TabPanel({
  idPrefix,
  value,
  className,
  children,
}: {
  idPrefix: string;
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${value}`}
      aria-labelledby={`${idPrefix}-tab-${value}`}
      className={className}
    >
      {children}
    </div>
  );
}
