"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { COLORS } from "@/lib/brand";
import { V4_COMMAND_ITEMS, V4_SHELL_ASSESS_HREF, isV4AssessPath } from "@/lib/layout/v4-shell";
import { useAssessmentWalkChrome } from "@/components/v4/assessment/AssessmentWalkChrome";

/**
 * SHELL_CRAFT v4 — top command. Greeting lives here so it never overlaps
 * the Home verdict/score. Assess is the one solid cyan action. Ask HōMI
 * is a field, not a Homie cast. No second score on chrome.
 */
export function V4TopCommand({
  greeting,
  firstName,
  onOpenRail,
}: {
  greeting: string;
  firstName: string | null;
  onOpenRail?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const nameBit = firstName ? `, ${firstName}` : "";
  const { chrome } = useAssessmentWalkChrome();
  const assessActive = isV4AssessPath(pathname ?? "");
  const askPlaceholder = chrome.askPlaceholder;
  const commandLabel = chrome.commandLabel;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((value) => !value);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return V4_COMMAND_ITEMS;
    return V4_COMMAND_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  function onAsk(e: FormEvent) {
    e.preventDefault();
    setOpen(true);
  }

  return (
    <>
      <header
        data-v4-top-command=""
        className="chrome-frost v4-top-command fixed inset-x-0 top-0 z-[var(--z-nav)] lg:left-[var(--v4-rail-width)]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex min-h-[var(--v4-command-height,var(--nav-height))] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="chrome-icon-btn v4-rail-open"
            aria-label="Open navigation"
            data-v4-rail-open=""
            onClick={onOpenRail}
          >
            <span aria-hidden className="text-lg leading-none">
              ☰
            </span>
          </button>
          <p
            className="min-w-0 max-w-[7.5rem] truncate text-sm font-medium text-light sm:max-w-[12rem]"
            data-v4-greeting=""
            data-v4-assess-context={commandLabel ? "" : undefined}
          >
            {commandLabel ?? `${greeting}${nameBit}`}
          </p>
          <form className="min-w-0 flex-1" onSubmit={onAsk} data-v4-ask-homi-form="">
            <label className="sr-only" htmlFor="v4-ask-homi">
              Ask HōMI
            </label>
            <div className="v4-ask-field">
              <Search aria-hidden className="v4-ask-field-icon size-4" strokeWidth={1.75} />
              <input
                id="v4-ask-homi"
                data-v4-ask-homi=""
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setOpen(true)}
                placeholder={askPlaceholder}
                className="v4-ask-field-input"
              />
              <kbd className="chrome-kbd v4-ask-kbd" aria-hidden>
                ⌘K
              </kbd>
            </div>
          </form>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={V4_SHELL_ASSESS_HREF}
              className={`v4-command-assess${assessActive ? " is-active" : ""}`}
              data-v4-command-assess=""
              aria-current={assessActive ? "page" : undefined}
              style={{ backgroundColor: COLORS.cyan, color: COLORS.ctaInk }}
            >
              Assess
            </Link>
          </div>
        </div>
      </header>
      {open ? (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center bg-navy/70 px-4 pt-24"
          data-v4-command-palette=""
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close Ask HōMI"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-navy-light p-3">
            <p className="px-1 pb-2 text-2xs font-semibold uppercase tracking-[0.08em] text-dim">
              Ask HōMI
            </p>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask HōMI"
              aria-label="Ask HōMI"
              className="w-full rounded-xl border border-white/10 bg-navy px-3 py-2 text-sm text-light"
            />
            <ul className="mt-2 max-h-64 overflow-y-auto">
              {results.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-light hover:bg-white/[0.04]"
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      router.push(item.href);
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      <span className="sr-only">{pathname}</span>
    </>
  );
}
