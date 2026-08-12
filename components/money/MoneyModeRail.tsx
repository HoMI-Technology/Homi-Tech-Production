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
            title={mode.label}
            aria-label={mode.label}
            aria-current={isActive ? "page" : undefined}
            data-active={isActive ? "true" : "false"}
            className="money-mode-btn"
          >
            <span aria-hidden>{mode.glyph}</span>
          </Link>
        );
      })}
    </nav>
  );
}
