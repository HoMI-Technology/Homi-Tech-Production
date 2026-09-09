"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { V4_MOBILE_TABS, V4_MORE_NAV, isV4NavActive } from "@/lib/layout/v4-shell";

/**
 * SHELL_CRAFT v4 mobile bottom: Home · Money · Path · More.
 * Text labels only — no Lucide brand marks.
 */
export function V4MobileNav() {
  const pathname = usePathname() ?? "/home";
  const [moreOpen, setMoreOpen] = useState(false);

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
            <ul className="mt-3 space-y-1">
              {V4_MORE_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-xl px-3 py-2 text-sm text-light hover:bg-white/[0.04]"
                    onClick={() => setMoreOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
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
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              data-v4-mobile-tab={tab.label.toLowerCase()}
              className={`flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-2xs font-semibold tracking-wide ${
                active ? "text-cyan" : "text-dim hover:text-light"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          data-v4-mobile-tab="more"
          className={`flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-2xs font-semibold tracking-wide ${
            moreOpen ? "text-cyan" : "text-dim hover:text-light"
          }`}
          onClick={() => setMoreOpen((value) => !value)}
        >
          More
        </button>
      </nav>
    </>
  );
}
