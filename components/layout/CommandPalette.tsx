"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useScrollLock } from "@/hooks/useScrollLock";
import {
  PALETTE_CATALOG,
  type PaletteItem,
  visiblePaletteItems,
} from "@/lib/dashboard/palette-visibility";
import type { SwitcherContext } from "@/lib/dashboard/switcher-visibility";

/**
 * ⌘K command palette — capability-filtered, glass-styled, keyboard-first.
 * Role destinations come from the same pure rules as the dashboard switcher.
 */
export function CommandPalette({
  open,
  onClose,
  roleContext,
}: {
  open: boolean;
  onClose: () => void;
  /** When omitted, shows the full catalog (should only happen in tests). */
  roleContext?: SwitcherContext;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const catalog = useMemo(
    () => (roleContext ? visiblePaletteItems(roleContext) : PALETTE_CATALOG),
    [roleContext],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    const starts: PaletteItem[] = [];
    const contains: PaletteItem[] = [];
    for (const item of catalog) {
      const label = item.label.toLowerCase();
      if (label.startsWith(q)) starts.push(item);
      else if (`${label} ${item.keywords ?? ""}`.includes(q)) contains.push(item);
    }
    return [...starts, ...contains];
  }, [query, catalog]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      returnFocusRef.current?.focus?.();
    };
  }, [open]);

  // Shared y-only body scroll lock (task 3.5) — replaces the local
  // overflow:hidden toggle; x gets `clip` so position:sticky keeps working.
  useScrollLock(open);

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Client-only portal target check; `open` is client-state-driven, so SSR
  // never reaches the createPortal below anyway.
  if (typeof document === "undefined") return null;
  if (!open) return null;

  function go(item: PaletteItem | undefined) {
    if (!item) return;
    onClose();
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (results.length === 0 ? 0 : (a + 1) % results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (results.length === 0 ? 0 : (a - 1 + results.length) % results.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  // Portal to document.body (task 3.5): escapes the ClientProviders
  // page-transition wrapper, whose transient will-change:transform makes it
  // the containing block for fixed descendants.
  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-modal)]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="absolute inset-0 bg-navy/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="glass relative mx-auto mt-[12vh] w-[min(560px,92vw)] overflow-hidden !p-0">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={results.length > 0 ? `palette-item-${active}` : undefined}
          aria-label="Jump to a page or action"
          className="w-full bg-transparent px-5 py-4 text-light outline-none placeholder:text-dim"
          placeholder="Jump to…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="hairline" />
        <ul
          id="palette-list"
          role="listbox"
          aria-label="Results"
          className="max-h-[320px] overflow-y-auto p-2"
        >
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-dim">
              Nothing matches &ldquo;{query}&rdquo;.
            </li>
          )}
          {results.map((item, i) => (
            <li key={item.href} id={`palette-item-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                tabIndex={-1}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  i === active ? "bg-slate-surface text-light" : "text-dim"
                }`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item)}
              >
                <span>{item.label}</span>
                <span className="ml-auto text-2xs uppercase tracking-wider text-dim">
                  {item.group}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="hairline" />
        <p className="px-4 py-2.5 text-2xs text-dim">
          <kbd className="rounded border border-slate-high/60 px-1">↑↓</kbd> navigate ·{" "}
          <kbd className="rounded border border-slate-high/60 px-1">↵</kbd> open ·{" "}
          <kbd className="rounded border border-slate-high/60 px-1">esc</kbd> close
        </p>
      </div>
    </div>,
    document.body,
  );
}
