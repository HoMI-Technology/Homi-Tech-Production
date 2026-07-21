"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { pageSection, track } from "@/lib/analytics";

/**
 * Fires a `page_viewed` occurrence event on initial load and every client-side
 * navigation. The PostHog snippet intentionally runs with
 * `capture_pageview:false` (explicit occurrence events only), so this beacon
 * is what feeds the owner analytics dashboard's visits / views / uniques /
 * session metrics. No-op weight when PostHog is not configured: track() only
 * appends to the in-memory `window.__homiEvents` buffer.
 *
 * Props stay occurrence-only: a coarse page section, never the raw path
 * (dynamic segments can carry share tokens).
 */
export function PageViewBeacon() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastSent.current === pathname) return;
    lastSent.current = pathname;
    track("page_viewed", { section: pageSection(pathname) });
  }, [pathname]);

  return null;
}
