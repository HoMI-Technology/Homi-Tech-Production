"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { Wordmark } from "@/components/brand/Wordmark";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { DashboardSwitcher } from "@/components/layout/DashboardSwitcher";
import { isActivePath } from "@/components/layout/HeaderShell";
import { APP_MORE_NAV, APP_PRIMARY_NAV } from "@/lib/layout/app-nav";
import {
  MORE_DRAWER_GROUPS,
  moreDrawerGroupForHref,
  sortMoreDrawerItems,
  type MoreDrawerGroup,
} from "@/lib/layout/nav-catalog";
import { SIGNED_IN_ASSESS_HREF } from "@/components/marketing/first-moment-copy";

/**
 * SHELL_CRAFT v3 — quiet signed-in top bar.
 * ThresholdCompass 28 + HōMI wordmark + role (only when >1) + Assess + ···.
 * No left rail. No Jump slab. No score chip. Depth only behind ··· (live routes).
 * Compass stays in this bar — never in the page body.
 * More is a demoted catalog drawer — not a peer home and not a /more URL.
 */

const SHELL_COMPASS_SIZE = 28;

/** Live depth behind ···. HōMI is the logo; Assess is the primary CTA. */
function shellDepthNav(): { href: string; label: string }[] {
  const primaryDepth = APP_PRIMARY_NAV.filter(
    (item) => item.href !== "/dashboard" && item.href !== "/assessment",
  );
  return [...primaryDepth, ...APP_MORE_NAV];
}

function groupDepthNav(depthNav: { href: string; label: string }[]) {
  const grouped: Record<MoreDrawerGroup, { href: string; label: string }[]> = {
    build: [],
    care: [],
  };
  const leftover: { href: string; label: string }[] = [];
  for (const item of depthNav) {
    const group = moreDrawerGroupForHref(item.href);
    if (group) grouped[group].push(item);
    else leftover.push(item);
  }
  grouped.build = sortMoreDrawerItems("build", grouped.build);
  grouped.care = sortMoreDrawerItems("care", grouped.care);
  return { grouped, leftover };
}

export function AppHeader({
  email,
  role,
  employerId,
  organizationId,
}: {
  email: string | null;
  role?: string | null;
  employerId?: string | null;
  organizationId?: string | null;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const depthNav = shellDepthNav();
  const { grouped, leftover } = groupDepthNav(depthNav);
  const switcherProps = { role, employerId, organizationId };
  const assessActive = isActivePath(pathname, "/assessment");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <header
        data-app-shell="v3"
        className="chrome-frost fixed inset-x-0 top-0 z-[var(--z-nav)]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex h-[var(--nav-height)] max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/dashboard"
            aria-label="HōMI dashboard"
            aria-current={isActivePath(pathname, "/dashboard") ? "page" : undefined}
            data-shell-logo=""
            className="flex min-h-11 shrink-0 items-center gap-2"
          >
            <span data-shell-compass="" className="flex size-7 items-center justify-center">
              <ThresholdCompass size={SHELL_COMPASS_SIZE} glow={false} animated={false} />
            </span>
            <Wordmark size="text-xl leading-none" />
          </Link>

          <div data-shell-role="" className="min-w-0">
            <DashboardSwitcher {...switcherProps} />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href={SIGNED_IN_ASSESS_HREF}
              className="btn btn-primary btn-sm"
              data-shell-assess=""
              aria-current={assessActive ? "page" : undefined}
            >
              Assess
            </Link>

            <div ref={moreRef} className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-label="More"
                data-shell-more=""
                className="chrome-icon-btn !h-10 !min-w-10 !px-0 text-dim"
              >
                <span aria-hidden className="text-lg leading-none tracking-[0.2em]">
                  ···
                </span>
              </button>
              {moreOpen && (
                <div
                  role="menu"
                  aria-label="More"
                  data-more-drawer=""
                  className="chrome-menu chrome-menu--drawer max-h-[min(70dvh,32rem)] overflow-y-auto"
                >
                  {email && (
                    <p className="truncate px-3 py-2 text-xs text-dim" title={email}>
                      {email}
                    </p>
                  )}
                  {MORE_DRAWER_GROUPS.map((group) => (
                    <div key={group.id} data-more-group={group.id}>
                      <p className="chrome-menu-group-label">{group.label}</p>
                      {grouped[group.id].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          className={`chrome-menu-item ${
                            isActivePath(pathname, item.href) ? "is-active" : ""
                          }`}
                          aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                  {leftover.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className={`chrome-menu-item ${
                        isActivePath(pathname, item.href) ? "is-active" : ""
                      }`}
                      aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div data-more-group="account">
                    <p className="chrome-menu-group-label">Account</p>
                    <Link href="/settings" role="menuitem" className="chrome-menu-item">
                      Settings
                    </Link>
                    <Link href="/settings/subscription" role="menuitem" className="chrome-menu-item">
                      Subscription
                    </Link>
                    <form action="/auth/sign-out" method="post">
                      <button type="submit" role="menuitem" className="chrome-menu-item w-full text-left">
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {moreOpen && (
        <div
          aria-hidden
          data-more-backdrop=""
          className="chrome-more-backdrop"
          onClick={() => setMoreOpen(false)}
        />
      )}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        roleContext={switcherProps}
      />
    </>
  );
}
