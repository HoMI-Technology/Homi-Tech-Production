"use client";

import { useEffect } from "react";
import {
  ATTRIBUTION_COOKIE,
  buildAttribution,
  serializeAttributionCookie,
} from "@/lib/attribution";

/**
 * Snapshots first-touch acquisition params (?ref=, ?utm_*) into the
 * attribution cookie. Mounted once in the root layout; renders nothing.
 * First-touch wins: an existing cookie is never overwritten, so navigating
 * through a second campaign link later doesn't reassign credit.
 */
export function AttributionCapture() {
  useEffect(() => {
    try {
      if (document.cookie.split(";").some((c) => c.trim().startsWith(`${ATTRIBUTION_COOKIE}=`))) {
        return;
      }
      const snapshot = buildAttribution(
        new URLSearchParams(window.location.search),
        window.location.pathname,
        new Date(),
      );
      if (snapshot) document.cookie = serializeAttributionCookie(snapshot);
    } catch {
      // Attribution must never break a page.
    }
  }, []);

  return null;
}
