"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HeaderShell, isActivePath } from "@/components/layout/HeaderShell";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { DashboardSwitcher } from "@/components/layout/DashboardSwitcher";
import { APP_MORE_NAV, APP_PRIMARY_NAV } from "@/lib/layout/app-nav";

/**
 * Signed-in application header — operate chrome, one line.
 * Layout: wordmark · primary (≤4) · More · [flex] · workspace · search · bell · avatar
 */

const PRIMARY = APP_PRIMARY_NAV;
const MORE = APP_MORE_NAV;

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
  const [userOpen, setUserOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutLabel, setShortcutLabel] = useState("⌘K");
  const moreRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!/Mac|iP(hone|ad|od)/.test(navigator.userAgent)) setShortcutLabel("Ctrl K");
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
    setUserOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMoreOpen(false);
        setUserOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const initial = (email?.trim()?.[0] ?? "H").toUpperCase();
  const switcherProps = {
    role,
    employerId,
    organizationId,
  };

  return (
    <>
      <HeaderShell
        logoHref="/dashboard"
        logoAriaLabel="HōMI dashboard"
        menuId="app-mobile-menu"
        nav={
          <>
            {PRIMARY.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`chrome-nav-link ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}

            <div ref={moreRef} className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                className={`chrome-nav-link chrome-nav-link--btn ${
                  MORE.some((m) => isActivePath(pathname, m.href)) ? "is-active" : ""
                }`}
              >
                More
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  aria-hidden
                >
                  <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {moreOpen && (
                <div role="menu" className="chrome-menu chrome-menu--more">
                  {MORE.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className={`chrome-menu-item ${
                        isActivePath(pathname, item.href) ? "is-active" : ""
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        }
        right={
          <>
            <DashboardSwitcher {...switcherProps} />
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="chrome-icon-btn"
              aria-label="Jump to…"
              title={`Jump to… (${shortcutLabel})`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              <kbd className="chrome-kbd">{shortcutLabel}</kbd>
            </button>
            <NotificationBell />
            <div ref={userRef} className="relative">
              <button
                type="button"
                onClick={() => setUserOpen((o) => !o)}
                aria-expanded={userOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
                className="chrome-avatar"
              >
                {initial}
              </button>
              {userOpen && (
                <div role="menu" className="chrome-menu chrome-menu--account">
                  {email && (
                    <p className="truncate px-3 py-2 text-xs text-dim" title={email}>
                      {email}
                    </p>
                  )}
                  <div className="hairline my-1" />
                  <Link href="/settings" role="menuitem" className="chrome-menu-item">
                    Settings
                  </Link>
                  <Link href="/settings/subscription" role="menuitem" className="chrome-menu-item">
                    Subscription
                  </Link>
                  <form action="/auth/sign-out" method="post">
                    <button
                      type="submit"
                      role="menuitem"
                      className="chrome-menu-item w-full text-left"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          </>
        }
        menuContent={
          <>
            <div className="flex items-center justify-between gap-3 px-1 pb-2">
              <span className="truncate text-xs text-dim">{email ?? "Signed in"}</span>
              <NotificationBell />
            </div>
            <div className="px-1 pb-2">
              <DashboardSwitcher {...switcherProps} />
            </div>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="chrome-menu-item w-full text-left"
              aria-label="Jump to…"
            >
              Jump to…
              <kbd className="ml-auto chrome-kbd">{shortcutLabel}</kbd>
            </button>
            <div className="hairline my-1" />
            {[...PRIMARY, ...MORE].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`chrome-menu-item ${
                  isActivePath(pathname, item.href) ? "is-active" : ""
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="hairline my-2" />
            <Link href="/settings" className="chrome-menu-item">
              Settings
            </Link>
            <Link href="/settings/subscription" className="chrome-menu-item">
              Subscription
            </Link>
            <form action="/auth/sign-out" method="post">
              <button type="submit" className="chrome-menu-item w-full text-left">
                Sign out
              </button>
            </form>
          </>
        }
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        roleContext={switcherProps}
      />
    </>
  );
}
