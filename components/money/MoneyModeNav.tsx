"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Money Reality mode switcher — Stand · Track · Decide (+ Plan as secondary).
 * OPERATE contract: one segmented control, not an 8-tab cockpit.
 */

export type MoneyMode = "stand" | "track" | "plan" | "decide";

const MODES: { id: MoneyMode; href: string; label: string; hint: string }[] = [
  { id: "stand", href: "/money", label: "Stand", hint: "Am I okay?" },
  { id: "track", href: "/money/budget", label: "Track", hint: "Budget & flows" },
  { id: "plan", href: "/money/plan", label: "Plan", hint: "Build path" },
  { id: "decide", href: "/money/decide", label: "Decide", hint: "Decision math" },
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
      className="mt-6 flex flex-wrap gap-1 rounded-xl border border-line/80 bg-slate-surface/30 p-1"
    >
      {MODES.map((mode) => {
        const isActive = mode.id === active;
        return (
          <Link
            key={mode.id}
            href={mode.href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "min-w-[4.5rem] flex-1 rounded-lg px-3 py-2.5 text-center transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
              isActive
                ? "bg-navy-light/90 text-light shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]"
                : "text-dim hover:bg-slate-surface/50 hover:text-light",
            ].join(" ")}
          >
            <span className="block text-sm font-semibold tracking-tight">{mode.label}</span>
            <span className="mt-0.5 block text-[0.65rem] leading-tight text-dim/80">{mode.hint}</span>
          </Link>
        );
      })}
    </nav>
  );
}
