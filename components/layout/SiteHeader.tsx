"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeaderShell, isActivePath } from "@/components/layout/HeaderShell";
import { NotificationBell } from "@/components/layout/NotificationBell";

const NAV = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/assessment", label: "Assessment" },
  // Public acquisition catalog (Money Reality design: hub stays crawlable).
  // Signed-in chrome uses Money — see nav-catalog + QuickActionGrid.
  { href: "/tools", label: "Calculators" },
  { href: "/guides", label: "Guides" },
  { href: "/pricing", label: "Pricing" },
  { href: "/b2b", label: "For Teams" },
] as const;

/** Marketing header for anonymous visitors. Chrome lives in HeaderShell. */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <HeaderShell
      logoHref="/"
      logoAriaLabel="HōMI home"
      menuId="site-mobile-menu"
      nav={NAV.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan ${
              active ? "text-cyan" : "text-dim hover:text-light"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
      right={
        <>
          <NotificationBell />
          <Link
            href="/auth/sign-in"
            className="text-sm text-dim transition-colors hover:text-light"
          >
            Sign in
          </Link>
          <Link href="/shadow-score" className="btn btn-primary btn-sm">
            Get your score
          </Link>
        </>
      }
      menuContent={
        <>
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-xs uppercase tracking-wide text-dim">Menu</span>
            <NotificationBell />
          </div>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-light hover:bg-slate-surface"
            >
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
        </>
      }
    />
  );
}
