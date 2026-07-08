"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled ? "glass !rounded-none border-x-0 border-t-0" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="HōMI home">
          <Wordmark size="text-2xl" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
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

        <div className="hidden items-center gap-3 md:flex">
          <NotificationBell />
          <Link href="/auth/sign-in" className="text-sm text-dim transition-colors hover:text-light">
            Sign in
          </Link>
          <Link href="/shadow-score" className="btn btn-primary !px-4 !py-2 text-sm">
            Get your score
          </Link>
        </div>

        <button
          className="btn btn-ghost !p-2 md:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M4 4l12 12M16 4L4 16" /> : <path d="M3 5h14M3 10h14M3 15h14" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="glass mx-4 mb-4 flex flex-col gap-1 p-4 md:hidden">
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
