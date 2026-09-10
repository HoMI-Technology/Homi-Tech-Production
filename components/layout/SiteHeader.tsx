"use client";

import Link from "next/link";
import { HeaderShell } from "@/components/layout/HeaderShell";

/**
 * Marketing header for KEEP surfaces (landing, waitlist, legal).
 * Product nav and First Moment close are DARK under PR15 — trim, do not advertise.
 */
export function SiteHeader() {
  return (
    <HeaderShell
      logoHref="/"
      logoAriaLabel="HōMI home"
      menuId="site-mobile-menu"
      nav={null}
      right={
        <Link href="/auth/sign-in" className="site-nav-link">
          Sign in
        </Link>
      }
      menuContent={
        <Link href="/auth/sign-in" className="rounded-lg px-3 py-2 text-sm text-dim">
          Sign in
        </Link>
      }
    />
  );
}
