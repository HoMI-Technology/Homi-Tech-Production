"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, type LucideIcon } from "lucide-react";

/**
 * Mobile (< lg) product bar. HōMI + Assess only.
 * Money is depth under More, not a global tab. Not a five-tab money cockpit.
 * Desktop (lg+) keeps the AppSidebar rail, so this bar is hidden at lg and up.
 *
 * Safe-area: the bar grows by env(safe-area-inset-bottom) so the iOS home
 * indicator never covers the tabs. Each tab keeps a ≥44×44px target.
 * No Lucide Compass here — the one Threshold Compass lives on the HōMI fold.
 */

const PRIMARY_TABS: readonly { href: string; label: string; Icon: LucideIcon | null }[] = [
  { href: "/dashboard", label: "HōMI", Icon: null },
  { href: "/assessment", label: "Assess", Icon: ClipboardCheck },
];

function tabIsActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  }
  if (href === "/assessment") {
    return pathname === "/assessment" || pathname.startsWith("/assessment/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ProductBottomNav() {
  const pathname = usePathname() ?? "/dashboard";

  return (
    <nav
      aria-label="HōMI"
      data-product-bottom-nav=""
      className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] flex border-t border-white/5 bg-navy/90 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {PRIMARY_TABS.map((tab) => {
        const isActive = tabIsActive(pathname, tab.href);
        const Icon = tab.Icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            data-active={isActive ? "true" : "false"}
            className={`flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-2xs font-semibold tracking-wide transition-colors ${
              isActive ? "text-cyan" : "text-dim hover:text-light"
            }`}
          >
            {Icon ? <Icon aria-hidden className="size-[18px]" strokeWidth={1.75} /> : null}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
