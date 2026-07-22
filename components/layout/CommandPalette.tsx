"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";

interface PaletteItem {
  href: string;
  label: string;
  group: string;
  keywords?: string;
}

/** Every signed-in destination, so the palette replaces "hunt the More menu". */
const ITEMS: PaletteItem[] = [
  { href: "/dashboard", label: "Dashboard", group: "Navigate", keywords: "home overview score" },
  { href: "/assessment", label: "Take the assessment", group: "Act", keywords: "readiness verdict full test measure" },
  { href: "/shadow-score", label: "Get a Shadow Score", group: "Act", keywords: "quick score fast read" },
  { href: "/daily", label: "Daily check-in", group: "Act", keywords: "mood stress pulse" },
  { href: "/simulator", label: "Simulate your score", group: "Act", keywords: "what if test move" },
  { href: "/advisor", label: "Talk to the Companion", group: "Act", keywords: "chat advisor ai talk" },
  { href: "/agents", label: "AI Agents roster", group: "Act", keywords: "agent os ensemble homie scout" },
  { href: "/agent-hub", label: "Agent Hub feed", group: "Act", keywords: "architecture json prompt export scrape" },
  { href: "/tools", label: "Tools", group: "Navigate", keywords: "calculators mortgage affordability money" },
  { href: "/journal", label: "Journal", group: "Navigate", keywords: "decisions log notes" },
  { href: "/plan", label: "Plan", group: "Navigate", keywords: "next steps path" },
  { href: "/decisions", label: "Decisions", group: "Navigate", keywords: "net position" },
  { href: "/signals", label: "Signals", group: "Navigate", keywords: "timing market watch" },
  { href: "/twin", label: "Future Twin", group: "Navigate", keywords: "letter future self" },
  { href: "/trinity", label: "Trinity", group: "Navigate", keywords: "pillars balance" },
  { href: "/finance", label: "Finance", group: "Navigate", keywords: "budget money numbers" },
  { href: "/calendar", label: "Calendar", group: "Navigate", keywords: "milestones dates" },
  { href: "/family", label: "Family", group: "Navigate", keywords: "household members" },
  { href: "/credit", label: "Credit", group: "Navigate", keywords: "score report" },
  { href: "/connections", label: "Connections", group: "Navigate", keywords: "bank plaid sync accounts" },
  { href: "/couples", label: "Couples", group: "Navigate", keywords: "partner alignment" },
  { href: "/genome", label: "Genome", group: "Navigate", keywords: "psychology profile" },
  { href: "/partner/dashboard", label: "Partner dashboard", group: "Roles", keywords: "referral clients partner" },
  { href: "/partner/portal", label: "Partner portal", group: "Roles", keywords: "invite resources partner" },
  { href: "/employee/dashboard", label: "Employee dashboard", group: "Roles", keywords: "benefits employer" },
  { href: "/employee/portal", label: "Employee portal", group: "Roles", keywords: "benefits hub portal" },
  { href: "/team", label: "Team dashboard", group: "Roles", keywords: "organization b2b aggregate" },
  { href: "/admin", label: "Admin", group: "Roles", keywords: "platform users waitlist" },
  { href: "/settings", label: "Settings", group: "Navigate", keywords: "account profile billing subscription" },
];

/**
 * ⌘K command palette — in-house (~zero dependency cost against the enforced
 * script budget), glass-styled, keyboard-first. Filtering is
 * prefix-then-substring over label + keywords; arrow keys move, Enter opens,
 * Escape closes. Focus returns to the opener on close.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ITEMS;
    const starts: PaletteItem[] = [];
    const contains: PaletteItem[] = [];
    for (const item of ITEMS) {
      const label = item.label.toLowerCase();
      if (label.startsWith(q)) starts.push(item);
      else if (`${label} ${item.keywords ?? ""}`.includes(q)) contains.push(item);
    }
    return [...starts, ...contains];
  }, [query]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

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

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Command palette">
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
        <ul id="palette-list" role="listbox" aria-label="Results" className="max-h-[320px] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-dim">Nothing matches &ldquo;{query}&rdquo;.</li>
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
                <span className="ml-auto text-[0.6875rem] uppercase tracking-wider text-dim">
                  {item.group}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="hairline" />
        <p className="px-4 py-2.5 text-[0.6875rem] text-dim">
          <kbd className="rounded border border-slate-high/60 px-1">↑↓</kbd> navigate ·{" "}
          <kbd className="rounded border border-slate-high/60 px-1">↵</kbd> open ·{" "}
          <kbd className="rounded border border-slate-high/60 px-1">esc</kbd> close
        </p>
      </div>
    </div>
  );
}
