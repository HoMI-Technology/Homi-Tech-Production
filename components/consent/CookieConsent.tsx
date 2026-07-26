"use client";

import { useEffect, useState } from "react";
// Outside NextIntlClientProvider in root layout — must use next/link, not i18n Link.
import Link from "next/link";
import { CONSENT_KEY } from "./consent-shared";

/**
 * Fixed-bottom consent bar, LCP-safe.
 *
 * The bar is SERVER-RENDERED visible: it paints at first paint for
 * unconsented visitors instead of popping in at hydration — the old
 * mount-then-show pattern made this banner the Largest Contentful Paint
 * element on most marketing pages (~2.9s, hydration-gated), failing the
 * Lighthouse budget site-wide.
 *
 * Flash prevention is handled by the inline pre-paint script in
 * app/layout.tsx (CONSENT_BOOT_SCRIPT): it stamps <html data-homi-consent>
 * for already-consented visitors (CSS hides the bar before paint) and
 * <html data-homi-consent-hold> on a first-visit homepage so the bar never
 * competes with the landing cinematic; this component lifts the hold after
 * the sequence finishes.
 */
export function CookieConsent() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already-consented (or storage-blocked, matching the old behavior of
    // never nagging when we can't remember the answer) → keep it hidden.
    try {
      if (window.localStorage.getItem(CONSENT_KEY) === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      setDismissed(true);
      return;
    }

    // First-visit homepage: the boot script held the bar back; release it
    // once the hero sequence has resolved (same 9s the sequence takes).
    const root = document.documentElement;
    if (root.hasAttribute("data-homi-consent-hold")) {
      const t = window.setTimeout(() => root.removeAttribute("data-homi-consent-hold"), 9000);
      return () => window.clearTimeout(t);
    }
  }, []);

  if (dismissed) return null;

  function accept() {
    try {
      window.localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      // Storage unavailable — still dismiss for this page view.
    }
    document.documentElement.setAttribute("data-homi-consent", "1");
    setDismissed(true);
  }

  return (
    <div id="cookie-consent" className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4">
      <div className="glass mx-auto flex max-w-2xl flex-col items-center gap-3 p-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-light">
          HōMI uses only essential cookies to keep you signed in. No trackers. No ad tech.{" "}
          <Link href="/legal/cookies" className="underline hover:text-cyan">
            Cookie policy
          </Link>
          .
        </p>
        <button onClick={accept} className="btn btn-primary shrink-0 !px-4 !py-2 text-sm">
          Accept
        </button>
      </div>
    </div>
  );
}
