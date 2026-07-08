"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { NotificationBell } from "@/components/layout/NotificationBell";

/**
 * Signed-in application header. Replaces the marketing SiteHeader for
 * authenticated users so the product is actually navigable — before this, the
 * (product) layout always rendered the marketing header ("Sign in", no links to
 * the app), stranding 8 working routes (trinity/twin/decisions/signals/credit/
 * calendar/family/connections). See AUDIT T2.1.
 *
 * Rendered only for signed-in users; anonymous visitors on public product pages
 * (tools, shadow-score) still get the marketing SiteHeader.
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

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader({ email }: { email: string | null }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on navigation.
  useEffect(() => {
    setMobileOpen(false);
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
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled ? "glass !rounded-none border-x-0 border-t-0" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-2" aria-label="HōMI dashboard">
          <Wordmark size="text-2xl" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {PRIMARY.map((item) => {
            const active = isActive(pathname, item.href);
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
                MORE.some((m) => isActive(pathname, m.href)) ? "text-cyan" : "text-dim hover:text-light"
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
                      isActive(pathname, item.href)
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
        </nav>

        <div className="hidden items-center gap-3 md:flex">
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
        </div>

        <button
          className="btn btn-ghost !p-2 md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? <path d="M4 4l12 12M16 4L4 16" /> : <path d="M3 5h14M3 10h14M3 15h14" />}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="glass mx-4 mb-4 flex flex-col gap-1 p-4 md:hidden">
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="truncate text-xs text-dim">{email ?? "Signed in"}</span>
            <NotificationBell />
          </div>
          {[...PRIMARY, ...MORE].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm hover:bg-slate-surface ${
                isActive(pathname, item.href) ? "text-cyan" : "text-light"
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
        </div>
      )}
    </header>
  );
}
