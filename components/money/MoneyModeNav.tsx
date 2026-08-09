"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Money Reality secondary nav — instrument-first.
 * Stand is the home; Track / Decide are peer actions; Plan is secondary.
 */

export type MoneyMode = "stand" | "track" | "plan" | "decide";

/** Single mode rail — the only place Stand/Track/Decide/Plan appear as peers. */
const MODES: { id: MoneyMode; href: string; label: string }[] = [
  { id: "stand", href: "/money", label: "Stand" },
  { id: "track", href: "/money/budget", label: "Track" },
  { id: "decide", href: "/money/decide", label: "Decide" },
  { id: "plan", href: "/money/plan", label: "Plan" },
];

function modeFromPath(pathname: string): MoneyMode {
  if (pathname.startsWith("/money/budget")) return "track";
  if (pathname.startsWith("/money/plan")) return "plan";
  if (pathname.startsWith("/money/decide")) return "decide";
  return "stand";
}

export function MoneyModeNav() {
  const pathname = usePathname() ?? "/money";
  const active = modeFromPath(pathname);

  return (
    <nav
      aria-label="Money modes"
      className="mt-5 flex flex-wrap gap-1 rounded-2xl border border-white/[0.08] bg-slate-surface/40 p-1"
    >
      {MODES.map((mode) => {
        const isActive = mode.id === active;
        return (
          <Link
            key={mode.id}
            href={mode.href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "min-w-[4.5rem] flex-1 rounded-xl px-3 py-2.5 text-center text-sm font-semibold tracking-tight transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
              isActive
                ? "bg-cyan/15 text-cyan shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]"
                : "text-dim hover:bg-white/[0.04] hover:text-light",
            ].join(" ")}
          >
            {mode.label}
          </Link>
        );
      })}
    </nav>
  );
}
