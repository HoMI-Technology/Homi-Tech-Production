"use client";

/**
 * Impact toast — transient Path progress feedback (PR #127).
 *
 * Headless controller over the unified toast system (task 3.2): it owns the
 * bus subscription, payload validation, dedupe, demo isolation, and transport
 * clearing, and delegates presentation (portal, bottom-center placement,
 * auto-dismiss timer, hover/focus pause, priority suppression) to
 * ToastProvider. Session/security notices (TOAST_PRIORITY.security) always
 * outrank Path progress (TOAST_PRIORITY.base): a visible session toast
 * suppresses new impacts, and one appearing mid-display displaces this toast
 * — the toast system's priority model, replacing the old
 * [data-priority-notice] MutationObserver protocol. role="status"
 * (informational, no focus stealing), flag-gated mount, hard /demo isolation.
 *
 * Every payload — stored or event-delivered — passes the full runtime guard
 * before display; invalid input fails closed. Duplicate impactIds display
 * once; the latest valid impact replaces any visible one and restarts the
 * timer. Never claims score motion, durability, or sync.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { TOAST_PRIORITY, useToastContext } from "@/components/ui/ToastProvider";
import {
  IMPACT_EVENT_NAME,
  clearStoredPathImpact,
  consumeStoredPathImpact,
  parsePathStepImpact,
  pathImpactToastCopy,
  type PathStepImpact,
} from "@/lib/readiness/impact-bus";

const AUTO_DISMISS_MS = 5_200;

/**
 * Locale prefixes no longer exist (#125 removed i18n): next.config.ts 308s (permanent: true)
 * /es/* onto the unprefixed route, so /demo is the only demo path usePathname
 * can ever report.
 */
function isDemoRoute(pathname: string): boolean {
  return pathname === "/demo" || pathname.startsWith("/demo/");
}

export function ImpactToast() {
  const pathname = usePathname();
  const isDemo = isDemoRoute(pathname);
  const toast = useToastContext();

  const [impact, setImpact] = useState<PathStepImpact | null>(null);
  const [visible, setVisible] = useState(false);

  const seenIdsRef = useRef<Set<string>>(new Set());

  const hide = useCallback(() => {
    setVisible(false);
    setImpact(null);
  }, []);

  /** Validate → priority gate → dedupe → consume matching stored copy → (re)display. */
  const show = useCallback(
    (raw: unknown) => {
      const next = parsePathStepImpact(raw);
      if (!next) return;
      // A session/security notice is on screen — Path progress must yield.
      if (toast.isSuppressed(TOAST_PRIORITY.base, "bottom-center")) return;
      if (seenIdsRef.current.has(next.impactId)) return;
      seenIdsRef.current.add(next.impactId);
      // The publisher stores AND dispatches; once the event path delivered,
      // clear the stored copy so a later mount cannot replay it.
      clearStoredPathImpact();
      setImpact(next);
      setVisible(true);
    },
    [toast],
  );

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

  // Declarative sync into the toast system: while an impact is visible,
  // exactly one bottom-center status toast exists for it. A new impact re-runs
  // the effect — the cleanup retracts the old toast silently (no side
  // effects) and notify() issues a fresh one with a full timer window, so a
  // replacement can never inherit a shrunken window. System-driven exits
  // (timeout, manual dismiss, priority suppression) flow back through
  // onDismiss.
  useEffect(() => {
    if (isDemo || !visible || !impact) return;
    const copy = pathImpactToastCopy(impact);
    const id = toast.notify({
      placement: "bottom-center",
      role: "status",
      priority: TOAST_PRIORITY.base,
      duration: AUTO_DISMISS_MS,
      pauseOnHover: true,
      className:
        "glass flex max-w-md flex-wrap items-start gap-3 border-emerald/35 p-4 sm:flex-nowrap",
      onDismiss: (reason) => {
        hide();
        // Suppression by a session notice only hides Path progress — the
        // transport is cleared on the user- or timer-driven exits, matching
        // the pre-consolidation behavior.
        if (reason === "timeout" || reason === "manual") clearStoredPathImpact();
      },
      content: (dismissToast) => (
        <>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-light">{copy.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-dim">{copy.body}</p>
          </div>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss Path progress"
            className="btn btn-ghost btn-sm shrink-0"
          >
            Dismiss
          </button>
        </>
      ),
    });
    if (id === null) {
      // Suppressed in the display race (a session notice won between
      // ingestion and render) — hide without clearing, mirroring the old
      // observer path.
      hide();
      return;
    }
    return () => {
      // Silent retract: replacement, demo entry, and unmount own their side
      // effects; already-removed ids are a no-op.
      toast.dismiss(id, null);
    };
  }, [isDemo, visible, impact, toast, hide]);

  return null;
}
