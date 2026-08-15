"use client";

import { useEffect, useState } from "react";
// Rendered from the root layout (app/layout.tsx) — plain next/link (i18n routing removed).
import Link from "next/link";
import { CONSENT_KEY, readConsent, writeConsent } from "./consent-shared";

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
    // Already decided either way — or storage-blocked, matching the old
    // behavior of never nagging when we can't remember the answer. A stored
    // "denied" hides the bar just like "granted": the visitor answered.
    if (readConsent() !== "unset") {
      setDismissed(true);
      return;
    }
    try {
      window.localStorage.getItem(CONSENT_KEY);
    } catch {
      // Storage unavailable: we cannot remember an answer, so don't ask.
      // Analytics stays off regardless — readConsent() returns "unset".
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

  // Both paths record a real decision. Rejecting is not "dismiss" — it stores
  // "denied", which keeps the analytics gate shut and stops the bar returning.
  function decide(state: "granted" | "denied") {
    writeConsent(state);
    setDismissed(true);
  }

  return (
    <div
      id="cookie-consent"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60]"
    >
      <div className="pointer-events-auto border-t border-white/[0.06] bg-navy/90 px-3 py-2 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-xs leading-snug text-dim">
            HōMI uses essential cookies to keep you signed in. Optional analytics help us improve the
            product — your choice, and you can change it anytime. No ad tech.{" "}
            <Link href="/legal/cookies" className="underline hover:text-cyan">
              Cookie policy
            </Link>
            .
          </p>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => decide("denied")} className="btn btn-ghost shrink-0 btn-sm">
              Reject optional
            </button>
            <button onClick={() => decide("granted")} className="btn btn-primary shrink-0 btn-sm">
              Accept optional
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
