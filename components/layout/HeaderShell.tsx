"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";

/**
 * Shared chrome for SiteHeader (marketing) and AppHeader (signed-in):
 * fixed glass bar, scroll state, hamburger toggle, and the mobile menu
 * panel with its full behavior set — body scroll lock, Escape (with
 * focus return), outside-click close, close on navigation, and close
 * when the viewport grows past lg so the scroll lock can't strand.
 *
 * The headers stay responsible for their own content (nav links,
 * dropdowns, menu rows); this shell owns everything they used to
 * duplicate.
 */
export function HeaderShell({
  logoHref,
  logoAriaLabel,
  menuId,
  nav,
  right,
  menuContent,
}: {
  logoHref: string;
  logoAriaLabel: string;
  /** Unique id linking the toggle's aria-controls to the panel. */
  menuId: string;
  /** Desktop nav links (shown ≥lg). */
  nav: ReactNode;
  /** Desktop right-side cluster (shown ≥lg). */
  right: ReactNode;
  /** Rows inside the mobile menu panel (shown <lg while open). */
  menuContent: ReactNode;
}) {
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
        <Link href={logoHref} className="flex items-center gap-2" aria-label={logoAriaLabel}>
          <Wordmark size="text-2xl" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {nav}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">{right}</div>

        <button
          ref={toggleRef}
          className="btn btn-ghost !p-2 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={menuId}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M4 4l12 12M16 4L4 16" /> : <path d="M3 5h14M3 10h14M3 15h14" />}
          </svg>
        </button>
      </div>

      {open && (
        <div
          id={menuId}
          className="glass mx-4 mb-4 flex max-h-[calc(100dvh-88px)] flex-col gap-1 overflow-y-auto overscroll-contain p-4 lg:hidden"
        >
          {menuContent}
        </div>
      )}
    </header>
  );
}

/** Shared active-route test for header nav links. */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
