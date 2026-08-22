"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, DollarSign, MapPin, Scale, Target, type LucideIcon } from "lucide-react";
import { MONEY_MODES, modeFromPath, type MoneyMode } from "@/components/money/MoneyModeNav";

/**
 * Product bottom tab bar — mobile (< lg) chrome for the five canonical modes:
 * Readiness · Reality · Decide · Plan · Goals. Mounted by ProductLayoutRouter
 * on signed-in product routes only, so signed-out guests never see it and the
 * full-bleed assessment shell keeps its focus mode. Desktop (lg+) keeps the
 * AppSidebar rail, so the bar is hidden at lg and up.
 *
 * Safe-area: the bar grows by env(safe-area-inset-bottom) so the iOS home
 * indicator never covers the tabs, and every tab keeps a ≥44×44px target
 * (min-h-14 × min-w-11 inside a flex-1 row). The CompanionHost FAB is raised
 * above the bar at the same breakpoint (see the max-lg bottom offsets in
 * CompanionHost / CompanionWidget), so the two never collide, and
 * ProductLayoutRouter pads the bottom of `main` so the fixed bar never
 * covers page content.
 *
 * Icons reuse the existing lucide set already proven in the signed-in chrome
 * (AppSidebar / MoneyDecideHub / planner); labels come from MONEY_MODES so
 * this bar can never drift from the Money cockpit tabs.
 */

const ICONS: Record<MoneyMode, LucideIcon> = {
  readiness: Compass,
  reality: DollarSign,
  decide: Scale,
  plan: MapPin,
  goals: Target,
};

export function ProductBottomNav() {
  const pathname = usePathname() ?? "/dashboard";
  const active = modeFromPath(pathname);

  return (
    <nav
      aria-label="Product modes"
      className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] flex border-t border-white/5 bg-navy/90 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {MONEY_MODES.map((mode) => {
        const isActive = mode.id === active;
        const Icon = ICONS[mode.id];
        return (
          <Link
            key={mode.id}
            href={mode.href}
            title={mode.blurb}
            aria-current={isActive ? "page" : undefined}
            data-active={isActive ? "true" : "false"}
            className={`flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-2xs font-semibold tracking-wide transition-colors ${
              isActive ? "text-cyan" : "text-dim hover:text-light"
            }`}
          >
            <Icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
            {mode.label}
          </Link>
        );
      })}
    </nav>
  );
}
