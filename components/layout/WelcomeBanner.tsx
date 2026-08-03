"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { COLORS, withAlpha } from "@/lib/brand";

const STORAGE_KEY = "homi_welcomed";
const DISMISS_MS = 10000;

/**
 * Signed-in onboarding toast. Deliberately scoped to the app dashboard: this
 * is a large text block that appears ~800ms after load, so on the public
 * marketing/funnel/tool pages it became the Largest Contentful Paint element
 * (painting late under Lighthouse's throttled mobile profile → ~4s LCP, the
 * site-wide budget failure). Those pages already have their own hero and CTA;
 * the "Welcome to HōMI" nudge belongs where a new user lands after signing in.
 */
function isAppSurface(pathname: string | null): boolean {
  if (!pathname) return false;
  // Match /dashboard (app/(product)/dashboard); the legacy /<locale>/dashboard
  // prefix from the removed i18n routing is still tolerated for stale links.
  return /^\/(?:[a-z]{2}\/)?dashboard(?:\/|$)/.test(pathname);
}

export function WelcomeBanner() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isAppSurface(pathname)) return;
    // Safe localStorage access inside useEffect (post-hydration)
    try {
      const welcomed = localStorage.getItem(STORAGE_KEY);
      if (welcomed === null) {
        const timer = setTimeout(() => setShow(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage not available (private browsing) — silently skip
    }
  }, [pathname]);

  useEffect(() => {
    if (!show || reducedMotion) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / DISMISS_MS) * 100);
      setProgress(pct);
      if (elapsed >= DISMISS_MS) {
        dismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [show, reducedMotion]);

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, []);

  if (!show) return null;

  return (
    <div
      // Fixed overlay (out of document flow): an in-flow banner that appears
      // 800ms after load pushed all content down — it was simultaneously the
      // top CLS source AND, being the largest late-painting text block, the LCP
      // element itself (~0.33 CLS / ~4s LCP on every public route, breaking the
      // mobile Lighthouse budget). As a fixed toast it can neither shift layout
      // nor displace the page's real hero as the largest contentful paint.
      //
      // z tier: shares --z-nav (40) — the banner is ambient chrome that must
      // sit below menus, overlays, modals, and toasts. Matches the prior z-40.
      className="glass glass-hover fixed inset-x-4 bottom-4 z-[var(--z-nav)] mx-auto max-w-xl overflow-hidden sm:left-auto sm:right-4 sm:mx-0"
      role="dialog"
      aria-label="Welcome to HōMI"
      style={{
        borderColor: withAlpha(COLORS.cyan, 0.25),
        boxShadow: `inset 0 1px 0 ${withAlpha(COLORS.light, 0.07)}, 0 24px 48px -18px rgba(2, 6, 16, 0.7), 0 0 44px -18px ${withAlpha(COLORS.cyan, 0.2)}`,
      }}
    >
      <div className="flex items-start gap-4 px-6 py-5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: withAlpha(COLORS.cyan, 0.12) }}
        >
          <svg className="h-5 w-5 text-cyan" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 2l6 2.5v4.5c0 5.05-3.41 9.76-8 10.5-4.59-1.08-6-4.36-6-8.5V4.5L10 2z" />
            <path d="M7.5 10l1.8 1.8L12.8 8" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-light">
            Welcome to HōMI — your decision companion
          </p>
          <p className="mt-1 text-sm leading-relaxed text-dim">
            Measure your readiness across Financial Reality, Emotional Truth, and
            Perfect Timing. Not &ldquo;can you afford it?&rdquo; — &ldquo;are you
            ready for it?&rdquo;
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={dismiss} className="btn btn-primary btn-sm">
              Get started
            </button>
            <button onClick={dismiss} className="btn btn-ghost btn-sm">
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1.5 text-dim transition-colors hover:text-light"
          aria-label="Dismiss welcome banner"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 2l12 12M14 2L2 14" />
          </svg>
        </button>
      </div>

      {!reducedMotion && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-cyan/50 transition-none"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
