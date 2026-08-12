"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Money Reality mode nav — horizontal labeled tabs under the app nav.
 *
 * Replaces the vertical S/T/D/P glyph rail: a single letter told the user
 * nothing about what Stand/Track/Decide/Plan meant, and the hover tooltip
 * that explained it was unreachable on touch. Labels are now always visible,
 * and this stays the ONLY place the four modes appear as peers.
 */

export type MoneyMode = "stand" | "track" | "plan" | "decide" | "goals" | "invest";

/** Single mode catalog — label is both the affordance and the a11y name. */
export const MONEY_MODES: { id: MoneyMode; href: string; label: string }[] = [
  { id: "stand", href: "/money", label: "Stand" },
  { id: "track", href: "/money/budget", label: "Track" },
  { id: "decide", href: "/money/decide", label: "Decide" },
  { id: "plan", href: "/money/plan", label: "Plan" },
  { id: "goals", href: "/money/goals", label: "Goals" },
  { id: "invest", href: "/money/investments", label: "Invest" },
];

export function modeFromPath(pathname: string): MoneyMode {
  if (pathname.startsWith("/money/budget")) return "track";
  if (pathname.startsWith("/money/plan")) return "plan";
  if (pathname.startsWith("/money/decide")) return "decide";
  if (pathname.startsWith("/money/goals")) return "goals";
  if (pathname.startsWith("/money/investments")) return "invest";
  return "stand";
}

export function MoneyModeNav() {
  const pathname = usePathname() ?? "/money";
  const active = modeFromPath(pathname);

  return (
    <nav aria-label="Money modes" className="money-mode-nav">
      {MONEY_MODES.map((mode) => {
        const isActive = mode.id === active;
        return (
          <Link
            key={mode.id}
            href={mode.href}
            aria-current={isActive ? "page" : undefined}
            data-active={isActive ? "true" : "false"}
            className="money-mode-tab"
          >
            {mode.label}
          </Link>
        );
      })}
    </nav>
  );
}
