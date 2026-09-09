"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { V4_COMMAND_ITEMS } from "@/lib/layout/v4-shell";

/**
 * SHELL_CRAFT v4 — top command. Greeting lives here so it never overlaps
 * the Home verdict/score. No second score on chrome.
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

  return (
    <>
      <header
        data-v4-top-command=""
        className="chrome-frost fixed inset-x-0 top-0 z-[var(--z-nav)] lg:left-[var(--v4-rail-width)]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex min-h-[var(--nav-height)] items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            className="chrome-icon-btn lg:hidden"
            aria-label="Open navigation"
            data-v4-rail-open=""
            onClick={onOpenRail}
          >
            <span aria-hidden className="text-lg leading-none">
              ☰
            </span>
          </button>
          <p className="min-w-0 truncate text-base font-medium text-light" data-v4-greeting="">
            {greeting}
            {nameBit}
          </p>
          <div className="ml-auto">
            <button
              type="button"
              className="chrome-icon-btn"
              aria-label="Search"
              data-v4-command-search=""
              onClick={() => setOpen(true)}
            >
              <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M13.5 13.5L17 17"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
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
            aria-label="Close search"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-navy-light p-3">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Go to…"
              aria-label="Command search"
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
