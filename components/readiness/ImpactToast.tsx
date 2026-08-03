"use client";

/**
 * Impact toast — transient Path progress feedback (PR #127).
 *
 * Sibling to SessionExpiredToast (glass, fixed bottom, dismiss) with a lower
 * z-index and self-suppression: session/security notices ([data-priority-notice])
 * always outrank Path progress. Differences from the session toast:
 * role="status" (informational, no focus stealing), auto-dismiss with
 * hover/focus pause, flag-gated mount, and hard /demo isolation.
 *
 * Every payload — stored or event-delivered — passes the full runtime guard
 * before display; invalid input fails closed. Duplicate impactIds display
 * once; the latest valid impact replaces any visible one and restarts the
 * timer. Never claims score motion, durability, or sync.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  IMPACT_EVENT_NAME,
  clearStoredPathImpact,
  consumeStoredPathImpact,
  parsePathStepImpact,
  pathImpactToastCopy,
  type PathStepImpact,
} from "@/lib/readiness/impact-bus";

const AUTO_DISMISS_MS = 5_200;
/** Floor on resume-after-pause so the toast never vanishes mid-glance. */
const MIN_RESUME_MS = 400;

/**
 * Locale prefixes no longer exist (#125 removed i18n): next.config.ts 308s (permanent: true)
 * /es/* onto the unprefixed route, so /demo is the only demo path usePathname
 * can ever report.
 */
function isDemoRoute(pathname: string): boolean {
  return pathname === "/demo" || pathname.startsWith("/demo/");
}

/** A session/security notice is on screen — Path progress must yield. */
function priorityNoticeActive(): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelector("[data-priority-notice]") !== null;
}

export function ImpactToast() {
  const pathname = usePathname();
  const isDemo = isDemoRoute(pathname);

  const [impact, setImpact] = useState<PathStepImpact | null>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const remainingRef = useRef(AUTO_DISMISS_MS);
  const timedImpactIdRef = useRef<string | null>(null);

  const hide = useCallback(() => {
    setVisible(false);
    setImpact(null);
    setPaused(false);
  }, []);

  const dismiss = useCallback(() => {
    hide();
    clearStoredPathImpact();
  }, [hide]);

  /** Validate → dedupe → consume matching stored copy → (re)display. */
  const show = useCallback((raw: unknown) => {
    const next = parsePathStepImpact(raw);
    if (!next) return;
    if (priorityNoticeActive()) return;
    if (seenIdsRef.current.has(next.impactId)) return;
    seenIdsRef.current.add(next.impactId);
    // The publisher stores AND dispatches; once the event path delivered,
    // clear the stored copy so a later mount cannot replay it.
    clearStoredPathImpact();
    setImpact(next);
    setPaused(false);
    setVisible(true);
  }, []);

  // Effect order is the race contract: (1) demo check, (2) listener
  // registration, (3) stored-impact consumption. Publication before mount is
  // bridged by storage; after registration by the event; in between the event
  // wins and show()'s dedupe + clear make the stored copy inert. Strict Mode
  // replays are absorbed by consume-once storage and the seen-id set.
  useEffect(() => {
    if (isDemo) return;
    function onImpact(event: Event) {
      show((event as CustomEvent<unknown>).detail);
    }
    window.addEventListener(IMPACT_EVENT_NAME, onImpact);
    const stored = consumeStoredPathImpact();
    if (stored) show(stored);
    return () => window.removeEventListener(IMPACT_EVENT_NAME, onImpact);
  }, [isDemo, show]);

  // Entering demo: hide immediately and clear the transient transport (both
  // the v1 key and the legacy key). No listener is attached while in demo.
  useEffect(() => {
    if (!isDemo) return;
    hide();
    clearStoredPathImpact();
  }, [isDemo, hide]);

  // Auto-dismiss with hover/focus pause. A new impact gets a full window
  // (timer restart); pausing banks the remaining time and resuming restarts
  // from what was left. The reset lives here — after the previous effect's
  // cleanup — so replacing an impact cannot inherit a shrunken window.
  useEffect(() => {
    if (!visible || !impact || paused) return;
    if (timedImpactIdRef.current !== impact.impactId) {
      timedImpactIdRef.current = impact.impactId;
      remainingRef.current = AUTO_DISMISS_MS;
    }
    const startedAt = Date.now();
    const timer = window.setTimeout(() => {
      hide();
      clearStoredPathImpact();
    }, remainingRef.current);
    return () => {
      window.clearTimeout(timer);
      remainingRef.current = Math.max(
        MIN_RESUME_MS,
        remainingRef.current - (Date.now() - startedAt),
      );
    };
  }, [visible, impact, paused, hide]);

  // A higher-priority notice appearing mid-display hides Path progress.
  useEffect(() => {
    if (!visible) return;
    if (priorityNoticeActive()) {
      hide();
      return;
    }
    const observer = new MutationObserver(() => {
      if (priorityNoticeActive()) hide();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [visible, hide]);

  if (isDemo || !visible || !impact) return null;

  const copy = pathImpactToastCopy(impact);

  // Portal to <body>: the root ClientProviders page-transition wrapper keeps a
  // permanent will-change:transform, which turns it into the containing block
  // for fixed descendants — position:fixed inside it pins to the page, not the
  // viewport. Rendering only happens client-side (visible is event-driven), so
  // document is always available here.
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      // Narrow viewports: the toast spans nearly full width, so it must sit
      // above the Companion launcher (h-14 at bottom-6 right-6) — same
      // clearance formula as the Companion panel. From sm up the centered
      // max-w-md card cannot reach the right corner, so it returns to the
      // session-toast baseline (and stays below its z-50).
      className="fixed inset-x-0 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] z-40 flex justify-center px-4 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="glass flex max-w-md flex-wrap items-start gap-3 border-emerald/35 p-4 sm:flex-nowrap">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-light">{copy.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-dim">{copy.body}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss Path progress"
          className="btn btn-ghost shrink-0 !px-3 !py-2 text-sm"
        >
          Dismiss
        </button>
      </div>
    </div>,
    document.body,
  );
}
