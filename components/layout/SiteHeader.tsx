"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { NotificationBell } from "@/components/layout/NotificationBell";

const NAV = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/assessment", label: "Assessment" },
  { href: "/tools", label: "Tools" },
  { href: "/guides", label: "Guides" },
  { href: "/pricing", label: "Pricing" },
  { href: "/b2b", label: "For Teams" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  // While the mobile menu is open: lock body scroll, close on Escape
  // (returning focus to the toggle), outside click, or growing past lg.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    function onPointer(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(false);
    }
    const desktop = window.matchMedia("(min-width: 64rem)");
    function onDesktop() {
      if (desktop.matches) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    desktop.addEventListener("change", onDesktop);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open]);

  return (
    <header
      ref={headerRef}
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled ? "glass !rounded-none border-x-0 border-t-0" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="HōMI home">
          <Wordmark size="text-2xl" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <NotificationBell />
          <Link href="/auth/sign-in" className="text-sm text-dim transition-colors hover:text-light">
            Sign in
          </Link>
          <Link href="/shadow-score" className="btn btn-primary !px-4 !py-2 text-sm">
            Get your score
          </Link>
        </div>

        <button
          ref={toggleRef}
          className="btn btn-ghost !p-2 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="site-mobile-menu"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M4 4l12 12M16 4L4 16" /> : <path d="M3 5h14M3 10h14M3 15h14" />}
          </svg>
        </button>
      </div>

      {open && (
        <div
          id="site-mobile-menu"
          className="glass mx-4 mb-4 flex max-h-[calc(100dvh-88px)] flex-col gap-1 overflow-y-auto overscroll-contain p-4 lg:hidden"
        >
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-xs uppercase tracking-wide text-dim">Menu</span>
            <NotificationBell />
          </div>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm text-light hover:bg-slate-surface">
              {item.label}
            </Link>
          ))}
          <div className="hairline my-2" />
          <Link href="/auth/sign-in" className="rounded-lg px-3 py-2 text-sm text-dim">
            Sign in
          </Link>
          <Link href="/shadow-score" className="btn btn-primary mt-1">
            Get your score
          </Link>
        </div>
      )}
    </header>
  );
}
