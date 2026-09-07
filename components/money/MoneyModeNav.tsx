"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Product mode nav — the five canonical tabs: Readiness · Reality · Decide ·
 * Plan · Goals. Rendered as the labeled horizontal tab row at the top of the
 * Money cockpit (MoneyShell) only. Signed-in v3 chrome is a quiet top bar —
 * Money stays depth, not a global mobile tab. ProductBottomNav is unmounted.
 *
 * Phase 1 doctrine stance (Home + Money Reality redesign): the Readiness tab
 * points at /dashboard — the score-forward HomeFold surface — while /dashboard
 * stays Path-owned in code structure. Invest and Track are no longer peer
 * tabs, but their routes stay live: /money/investments and /money/budget deep
 * links resolve and light the Reality tab as the active mode.
 */

export type MoneyMode = "readiness" | "reality" | "decide" | "plan" | "goals";

/**
 * Single mode catalog — label is both the affordance and the a11y name. The
 * blurb rides the native tooltip (`title`) on both nav surfaces, so the spec
 * microcopy ships without inventing new UI chrome.
 */
export const MONEY_MODES: { id: MoneyMode; href: string; label: string; blurb: string }[] = [
  {
    id: "readiness",
    href: "/dashboard",
    label: "Readiness",
    blurb: "Where you stand across the three pillars",
  },
  {
    id: "reality",
    href: "/money",
    label: "Reality",
    blurb: "The picture of your cash, as it actually is",
  },
  {
    id: "decide",
    href: "/money/decide",
    label: "Decide",
    blurb: "Stress the decision before you stretch",
  },
  {
    id: "plan",
    href: "/money/plan",
    label: "Plan",
    blurb: "The path that turns readiness into action",
  },
  {
    id: "goals",
    href: "/money/goals",
    label: "Goals",
    blurb: "What you’re building toward, and how far",
  },
];

/**
 * Pathname → active mode. Retired peer routes fold into their new home:
 * /money/budget (Track) and /money/investments (Invest) light Reality.
 * Returns null on routes outside the five surfaces (settings, journal, …).
 * The Money cockpit falls back to Reality.
 */
export function modeFromPath(pathname: string): MoneyMode | null {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "readiness";
  if (pathname.startsWith("/money/budget")) return "reality";
  if (pathname.startsWith("/money/investments")) return "reality";
  if (pathname.startsWith("/money/decide")) return "decide";
  if (pathname.startsWith("/money/plan")) return "plan";
  if (pathname.startsWith("/money/goals")) return "goals";
  if (pathname.startsWith("/money")) return "reality";
  return null;
}

export function MoneyModeNav() {
  const pathname = usePathname() ?? "/money";
  const active = modeFromPath(pathname) ?? "reality";

  return (
    <nav aria-label="Money modes" className="money-mode-nav">
      {MONEY_MODES.map((mode) => {
        const isActive = mode.id === active;
        return (
          <Link
            key={mode.id}
            href={mode.href}
            title={mode.blurb}
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
