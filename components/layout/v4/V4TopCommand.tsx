"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { COLORS } from "@/lib/brand";
import {
  V4_COMMAND_ITEMS,
  V4_SHELL_ASSESS_HREF,
  V4_SHELL_ASK_HREF,
  isV4AskOnlyPath,
  isV4AssessPath,
  isV4QuietCommandPath,
} from "@/lib/layout/v4-shell";
import { useAssessmentWalkChrome } from "@/components/v4/assessment/AssessmentWalkChrome";

/**
 * SHELL_CRAFT v4 — top command. Greeting lives here so it never overlaps
 * the Home verdict/score. Assess is the one solid cyan action. Ask HōMI
 * is a field, not a Homie cast. No second score. No live-AI typing.
 * Mobile: sheet (not a fifth bottom-nav peer). Desktop: command palette.
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
  const askOnly = isV4AskOnlyPath(pathname ?? "");
  const quietCommand = isV4QuietCommandPath(pathname ?? "");
  const askPlaceholder = chrome.askPlaceholder;
  const commandLabel = quietCommand ? "Admin" : chrome.commandLabel;
  const workspacePrompts = chrome.prompts;

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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflowY;
    document.body.style.overflowY = "hidden";
    return () => {
      document.body.style.overflowY = prev;
    };
  }, [open]);

  const promptResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workspacePrompts;
    return workspacePrompts.filter((item) => item.label.toLowerCase().includes(q));
  }, [query, workspacePrompts]);

  const navResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return V4_COMMAND_ITEMS;
    return V4_COMMAND_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function onAsk(e: FormEvent) {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    const match = workspacePrompts.find((item) => item.label.toLowerCase().includes(q));
    if (q && match) {
      go(match.href);
      return;
    }
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
          {quietCommand ? (
            <p className="min-w-0 flex-1 truncate text-2xs font-semibold uppercase tracking-[0.08em] text-dim" data-admin-v4-lock="">
              No Ask · Companion off
            </p>
          ) : (
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
                  autoComplete="off"
                />
                <kbd className="chrome-kbd v4-ask-kbd" aria-hidden>
                  ⌘K
                </kbd>
              </div>
            </form>
          )}
          <div className="ml-auto flex items-center gap-2">
            {quietCommand ? null : (
              <Link
                href={V4_SHELL_ASSESS_HREF}
                className={`v4-command-assess${assessActive ? " is-active" : ""}`}
                data-v4-command-assess=""
                aria-current={assessActive ? "page" : undefined}
                style={{ backgroundColor: COLORS.cyan, color: COLORS.ctaInk }}
              >
                Assess
              </Link>
            )}
          </div>
        </div>
      </header>
      {quietCommand || !open ? null : (
        <div
          className="v4-ask-overlay fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-navy/70 px-0 lg:items-start lg:justify-center lg:px-4 lg:pt-24"
          data-v4-command-palette=""
          data-v4-ask-sheet={askOnly ? "ask-only" : ""}
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close Ask HōMI"
            onClick={() => setOpen(false)}
          />
          <div className="v4-ask-sheet relative w-full rounded-t-2xl border border-white/10 bg-navy p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] lg:max-w-md lg:rounded-2xl lg:bg-navy-light lg:p-3 lg:pb-3">
            <p className="px-1 pb-2 text-2xs font-semibold uppercase tracking-[0.08em] text-dim">
              Ask HōMI
            </p>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={askPlaceholder}
              aria-label="Ask HōMI"
              className="w-full rounded-xl border border-white/10 bg-navy px-3 py-2 text-sm text-light lg:bg-navy"
            />
            <ul className="mt-2 max-h-64 overflow-y-auto" data-v4-ask-prompts="">
              {promptResults.map((item) => (
                <li key={`prompt-${item.href}-${item.label}`}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-light hover:bg-white/[0.04]"
                    data-v4-ask-prompt=""
                    onClick={() => go(item.href)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
              {askOnly ? null : (
                <li>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.04]"
                    data-v4-ask-open=""
                    style={{ color: COLORS.cyan }}
                    onClick={() => go(V4_SHELL_ASK_HREF)}
                  >
                    Open HōMI
                  </button>
                </li>
              )}
              {askOnly
                ? null
                : navResults.map((item) => (
                    <li key={`${item.href}-${item.label}`}>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-light hover:bg-white/[0.04]"
                        onClick={() => go(item.href)}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
            </ul>
          </div>
        </div>
      )}
      <span className="sr-only">{pathname}</span>
    </>
  );
}
