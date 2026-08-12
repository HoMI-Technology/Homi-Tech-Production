"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Money Reality mode rail — the vertical sub-rail of the dual-panel instrument.
 * Sits between the persistent picture panel and the mode content, and is the
 * ONLY place Stand/Track/Decide/Plan appear as peers.
 *
 * Collapses to a horizontal strip under lg (see .money-mode-rail in globals).
 */

export type MoneyMode = "stand" | "track" | "plan" | "decide";

/** Single mode catalog — glyph is the rail affordance, label is the a11y name. */
export const MONEY_MODES: { id: MoneyMode; href: string; label: string; glyph: string }[] = [
  { id: "stand", href: "/money", label: "Stand", glyph: "S" },
  { id: "track", href: "/money/budget", label: "Track", glyph: "T" },
  { id: "decide", href: "/money/decide", label: "Decide", glyph: "D" },
  { id: "plan", href: "/money/plan", label: "Plan", glyph: "P" },
];

export function modeFromPath(pathname: string): MoneyMode {
  if (pathname.startsWith("/money/budget")) return "track";
  if (pathname.startsWith("/money/plan")) return "plan";
  if (pathname.startsWith("/money/decide")) return "decide";
  return "stand";
}

export function MoneyModeRail() {
  const pathname = usePathname() ?? "/money";
  const active = modeFromPath(pathname);

  return (
    <nav aria-label="Money modes" className="money-mode-rail">
      {MONEY_MODES.map((mode) => {
        const isActive = mode.id === active;
        return (
          <Link
            key={mode.id}
            href={mode.href}
            aria-label={mode.label}
            aria-current={isActive ? "page" : undefined}
            data-active={isActive ? "true" : "false"}
            className="money-mode-btn group"
          >
            <span aria-hidden>{mode.glyph}</span>
            {/* Hover label. aria-hidden because the link already carries the
              * label as its accessible name — exposing both makes screen
              * readers announce "Stand Stand". The native `title` tooltip is
              * gone for the same reason: it would double up visually. */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-full top-1/2 z-10 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-white/[0.08] bg-slate-surface px-2 py-1 text-2xs font-medium text-light opacity-0 transition-opacity group-hover:opacity-100 lg:block"
            >
              {mode.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
