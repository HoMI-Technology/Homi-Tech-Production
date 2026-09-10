"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { V4_NAV_ICONS } from "@/components/layout/v4/v4-nav-icons";
import { V4_MOBILE_TABS, V4_MORE_NAV, isV4NavActive } from "@/lib/layout/v4-shell";

/**
 * SHELL_CRAFT v4 mobile bottom: Home · Money · Path · Compare · More.
 * Icons from the existing Lucide package only.
 */
export function V4MobileNav() {
  const pathname = usePathname() ?? "/home";
  const [moreOpen, setMoreOpen] = useState(false);
  const MoreIcon = V4_NAV_ICONS.More;

  return (
    <>
      {moreOpen ? (
        <div
          className="fixed inset-0 z-[var(--z-overlay)] bg-navy/70 lg:hidden"
          data-v4-more-sheet=""
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close more"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-white/10 bg-navy p-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
            <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-dim">More</p>
            <ul className="mt-3 space-y-1" data-v4-more-list="">
              {V4_MORE_NAV.map((item) => {
                const Icon = V4_NAV_ICONS[item.label];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-light hover:bg-white/[0.04]"
                      onClick={() => setMoreOpen(false)}
                    >
                      {Icon ? <Icon aria-hidden className="size-4 text-dim" strokeWidth={1.75} /> : null}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
      <nav
        aria-label="Primary"
        data-v4-mobile-nav=""
        className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] flex border-t border-white/5 bg-navy/90 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {V4_MOBILE_TABS.map((tab) => {
          const active = isV4NavActive(pathname, tab.href);
          const Icon = V4_NAV_ICONS[tab.label];
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              data-v4-mobile-tab={tab.label.toLowerCase()}
              className={`v4-mobile-tab flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-2xs font-semibold tracking-wide ${
                active ? "is-active text-light" : "text-dim hover:text-light"
              }`}
            >
              {Icon ? <Icon aria-hidden className="size-4" strokeWidth={1.75} /> : null}
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          data-v4-mobile-tab="more"
          className={`v4-mobile-tab flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-2xs font-semibold tracking-wide ${
            moreOpen ? "is-active text-light" : "text-dim hover:text-light"
          }`}
          onClick={() => setMoreOpen((value) => !value)}
        >
          {MoreIcon ? <MoreIcon aria-hidden className="size-4" strokeWidth={1.75} /> : null}
          More
        </button>
      </nav>
    </>
  );
}
