"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HeaderShell, isActivePath } from "@/components/layout/HeaderShell";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { DashboardSwitcher } from "@/components/layout/DashboardSwitcher";

/**
 * Signed-in application header. Replaces the marketing SiteHeader for
 * authenticated users so the product is actually navigable — before this, the
 * (product) layout always rendered the marketing header ("Sign in", no links to
 * the app), stranding 8 working routes (trinity/twin/decisions/signals/credit/
 * calendar/family/connections). See AUDIT T2.1.
 *
 * Rendered only for signed-in users; anonymous visitors on public product pages
 * (tools, shadow-score) still get the marketing SiteHeader. Shared chrome
 * (fixed bar, hamburger, mobile panel behavior) lives in HeaderShell; this
 * component owns the product nav, the "More" dropdown, and the account menu.
 */

const PRIMARY = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/assessment", label: "Assessment" },
  { href: "/tools", label: "Tools" },
  { href: "/journal", label: "Journal" },
];

// Everything else that was orphaned, grouped under "More" so it's all reachable.
const MORE = [
  { href: "/decisions", label: "Decisions" },
  { href: "/signals", label: "Signals" },
  { href: "/twin", label: "Future Twin" },
  { href: "/trinity", label: "Trinity" },
  { href: "/finance", label: "Finance" },
  { href: "/calendar", label: "Calendar" },
  { href: "/daily", label: "Daily Check-in" },
  { href: "/family", label: "Family" },
  { href: "/credit", label: "Credit" },
  { href: "/connections", label: "Connections" },
];

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

  // ⌘K / Ctrl+K opens the command palette from anywhere in the app.
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

  // Close dropdowns on navigation.
  useEffect(() => {
    setMoreOpen(false);
    setUserOpen(false);
  }, [pathname]);

  // Close dropdowns on outside click / Escape.
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
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? "text-cyan" : "text-dim hover:text-light"
                }`}
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
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                MORE.some((m) => isActivePath(pathname, m.href)) ? "text-cyan" : "text-dim hover:text-light"
              }`}
            >
              More
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {moreOpen && (
              <div
                role="menu"
                className="glass absolute right-0 mt-2 grid w-56 grid-cols-2 gap-0.5 p-2"
              >
                {MORE.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActivePath(pathname, item.href)
                        ? "bg-slate-surface text-cyan"
                        : "text-dim hover:bg-slate-surface hover:text-light"
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
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-surface/70 bg-slate-surface/40 px-3 py-1.5 text-xs text-dim transition-colors hover:border-cyan/40 hover:text-light"
            aria-label="Open command palette"
          >
            Jump to…
            <kbd className="rounded border border-slate-high/60 px-1.5 py-0.5 text-[0.625rem] tracking-wide">
              {shortcutLabel}
            </kbd>
          </button>
          <NotificationBell />
          <div ref={userRef} className="relative">
            <button
              type="button"
              onClick={() => setUserOpen((o) => !o)}
              aria-expanded={userOpen}
              aria-haspopup="menu"
              aria-label="Account menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-surface bg-slate-surface/60 text-sm font-semibold text-light transition-colors hover:border-cyan/50"
            >
              {initial}
            </button>
            {userOpen && (
              <div role="menu" className="glass absolute right-0 mt-2 w-56 p-2">
                {email && (
                  <p className="truncate px-3 py-2 text-xs text-dim" title={email}>
                    {email}
                  </p>
                )}
                <div className="hairline my-1" />
                <Link
                  href="/settings"
                  role="menuitem"
                  className="block rounded-lg px-3 py-2 text-sm text-dim hover:bg-slate-surface hover:text-light"
                >
                  Settings
                </Link>
                <form action="/auth/sign-out" method="post">
                  <button
                    type="submit"
                    role="menuitem"
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-dim hover:bg-slate-surface hover:text-light"
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
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="truncate text-xs text-dim">{email ?? "Signed in"}</span>
            <NotificationBell />
          </div>
          {[...PRIMARY, ...MORE].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm hover:bg-slate-surface ${
                isActivePath(pathname, item.href) ? "text-cyan" : "text-light"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="hairline my-2" />
          <Link href="/settings" className="rounded-lg px-3 py-2 text-sm text-dim">
            Settings
          </Link>
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm text-dim">
              Sign out
            </button>
          </form>
        </>
      }
    />
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
