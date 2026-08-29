"use client";

/**
 * CompanionHost — Lighthouse-safe shell for the Decision Companion.
 *
 * Why this exists (research-backed, do not "simplify" back to a static import):
 *
 * Lighthouse's `resource-summary:script:size` counts **every** script bytes
 * transferred during the audit — including idle-deferred and async chunks
 * that finish before network-quiet. Idle-mounting CompanionWidget still
 * billed ~the whole advisor/digest/thread-store graph against §11.
 *
 * Industry pattern for chat widgets (Next.js lazy-loading docs + real Next
 * Lighthouse writeups): ship a **tiny always-on launcher**, and
 * `import()` the heavy panel **only on user intent** (click / synthesis /
 * restored open session). Interaction-gated chunks are not requested during
 * a public LHCI run, so they do not count. E2E still works: Playwright
 * clicks "Open HōMI Companion", which loads the real widget.
 *
 * Guarded by `__tests__/perf-bundle-guards.test.ts`. Product layout must
 * import this host, never CompanionWidget directly.
 */

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";
import { COLORS } from "@/lib/brand";
import { SYNTHESIS_EVENT } from "@/lib/tools/digest";

/** Must stay in sync with CompanionWidget's OPEN_KEY. */
const OPEN_KEY = "homi:companion-open";

type CompanionWidgetComponent = ComponentType<{ skipIdle?: boolean }>;

export function CompanionHost() {
  const pathname = usePathname();
  const [idleReady, setIdleReady] = useState(false);
  const [Widget, setWidget] = useState<CompanionWidgetComponent | null>(null);
  const [loading, setLoading] = useState(false);

  const loadWidget = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const mod = await import("./CompanionWidget");
      setWidget(() => mod.CompanionWidget);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Thin launcher only — keep markup off LCP (same idle window as before).
  useEffect(() => {
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setIdleReady(true), { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setIdleReady(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  // Restored open panel (session) → must load the real widget.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(OPEN_KEY) === "1") {
      void loadWidget();
    }
  }, [loadWidget]);

  // Lens "What does this change for me?" fires before the widget exists —
  // load it so CompanionWidget can drain the pending synthesis message.
  useEffect(() => {
    function onSynthesis() {
      void loadWidget();
    }
    window.addEventListener(SYNTHESIS_EVENT, onSynthesis);
    return () => window.removeEventListener(SYNTHESIS_EVENT, onSynthesis);
  }, [loadWidget]);

  // Full chat lives on /advisor; keep admin uncluttered (same as widget).
  // HōMI first screen owns the one Threshold Compass — no Companion FAB there.
  if (
    pathname === "/advisor" ||
    pathname === "/admin" ||
    (pathname?.startsWith("/admin/") ?? false) ||
    pathname === "/dashboard" ||
    (pathname?.startsWith("/dashboard/") ?? false)
  ) {
    return null;
  }

  // Heavy graph is mounted: hand off entirely (widget owns launcher + panel).
  if (Widget) {
    return <Widget skipIdle />;
  }

  if (!idleReady) return null;

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        // Prefill open so the widget hydrates with the panel open (E2E + UX).
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(OPEN_KEY, "1");
        }
        void loadWidget();
      }}
      aria-expanded={false}
      aria-controls="homi-companion-panel"
      aria-label="Open HōMI Companion"
      className="companion-launcher compass-glow fixed right-6 z-[var(--z-menu)] flex h-14 w-14 items-center justify-center rounded-full border border-cyan/40 bg-navy-light/90 shadow-lg backdrop-blur bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] max-lg:bottom-[calc(4.5rem_+_env(safe-area-inset-bottom,0px))]"
    >
      {/* Inline mark — no ThresholdCompass in the public shell; COLORS only.
          max-lg raise: the FAB clears the ProductBottomNav tab bar (bar height
          + safe-area inset) so the launcher never covers a tab. */}
      <svg width="28" height="28" viewBox="0 0 40 40" aria-hidden="true">
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="none"
          stroke={COLORS.cyan}
          strokeWidth="1.5"
          opacity="0.7"
        />
        <circle cx="20" cy="20" r="4" fill={COLORS.cyan} />
        <path
          d="M20 6v6M20 28v6M6 20h6M28 20h6"
          stroke={COLORS.cyan}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
    </button>
  );
}
