"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeaderShell, isActivePath } from "@/components/layout/HeaderShell";
import {
  PRIMARY_CLOSE_HREF,
  PRIMARY_CLOSE_LABEL,
} from "@/components/marketing/first-moment-copy";

const NAV = [
  { href: "/how-it-works", label: "How It Works" },
  { href: PRIMARY_CLOSE_HREF, label: "Assessment" },
  { href: "/guides", label: "Guides" },
  { href: "/pricing", label: "Pricing" },
  { href: "/b2b", label: "For Teams" },
  { href: "/developers", label: "Developers" },
] as const;

/** Marketing header for anonymous visitors. Chrome lives in HeaderShell. */
export function SiteHeader() {
  const pathname = usePathname();
  // Guest `/` is wordmark + Sign in + Assess. The five product labels stay
  // on every other marketing route.
  const slimHome = pathname === "/";

  return (
    <HeaderShell
      logoHref="/"
      logoAriaLabel="HōMI home"
      menuId="site-mobile-menu"
      nav={
        slimHome
          ? null
          : NAV.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`site-nav-link${active ? " is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })
      }
      right={
        <>
          <Link href="/auth/sign-in" className="site-nav-link">
            Sign in
          </Link>
          <Link href={PRIMARY_CLOSE_HREF} className="btn btn-primary btn-sm">
            {PRIMARY_CLOSE_LABEL}
          </Link>
        </>
      }
      menuContent={
        <>
          {!slimHome && (
            <>
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-xs uppercase tracking-wide text-dim">Menu</span>
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
            </>
          )}
          <Link href="/auth/sign-in" className="rounded-lg px-3 py-2 text-sm text-dim">
            Sign in
          </Link>
          <Link href={PRIMARY_CLOSE_HREF} className="btn btn-primary mt-1">
            {PRIMARY_CLOSE_LABEL}
          </Link>
        </>
      }
    />
  );
}
