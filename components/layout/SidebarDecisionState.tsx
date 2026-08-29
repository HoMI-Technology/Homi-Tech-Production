"use client";

import { useEffect, useState } from "react";
import { VERDICT_META, withAlpha, type VerdictKey } from "@/lib/brand";
import { isFrozenForPerson, loadKnownPhase0Person, PHASE0_EVENT } from "@/lib/advisor/phase0";

/**
 * Persistent decision state for the app sidebar.
 *
 * READ-ONLY by construction: this module never writes to storage and never
 * calls the server. It reflects whatever the last assessment left behind in
 * localStorage under LATEST_VERDICT_KEY, and renders a quiet empty state when
 * there is nothing there (signed-in-but-never-assessed is the common case).
 *
 * Reading happens in an effect, not in the useState initializer, so the first
 * client render matches the server HTML — a storage read during render would
 * hydrate-mismatch every signed-in page.
 *
 * The verdict color is published to the document root as
 * --sidebar-verdict-color / --sidebar-verdict-tint so the sidebar's active-nav
 * treatment keys to the user's current standing without prop-drilling a color
 * through every nav item. app/globals.css :root holds the neutral defaults.
 */

export const LATEST_VERDICT_KEY = "homi-latest-verdict";

export type LatestVerdict = {
  verdict: VerdictKey;
  /** Composite readiness score, 0-100, rounded. */
  score: number;
  /** Days the decision has been held. Null when the payload omits it. */
  heldDays: number | null;
  /** Free-text decision label ("Home Buying"). Null when absent. */
  decisionType: string | null;
};

const VERDICT_KEYS = new Set(Object.keys(VERDICT_META));

/**
 * Parse the cached payload defensively. The writer is a different surface (and
 * a future one), and localStorage is user-writable, so every field is treated
 * as untrusted: a malformed blob degrades to the empty state rather than
 * throwing inside a layout component that wraps the whole signed-in app.
 */
export function parseLatestVerdict(raw: string | null): LatestVerdict | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  const { verdict, score } = record;
  if (typeof verdict !== "string" || !VERDICT_KEYS.has(verdict)) return null;
  if (typeof score !== "number" || !Number.isFinite(score)) return null;

  const heldDays =
    typeof record.heldDays === "number" && Number.isFinite(record.heldDays)
      ? Math.max(0, Math.round(record.heldDays))
      : null;
  const decisionType =
    typeof record.decisionType === "string" && record.decisionType.trim().length > 0
      ? record.decisionType.trim()
      : null;

  return {
    verdict: verdict as VerdictKey,
    score: Math.round(Math.min(100, Math.max(0, score))),
    heldDays,
    decisionType,
  };
}

/**
 * Latest cached verdict, or null. Re-reads on cross-tab `storage` events so a
 * fresh assessment in another tab updates the rail without a reload.
 */
export function useLatestVerdict(): LatestVerdict | null {
  const [state, setState] = useState<LatestVerdict | null>(null);

  useEffect(() => {
    function read() {
      try {
        if (isFrozenForPerson(loadKnownPhase0Person())) {
          setState(null);
          return;
        }
        setState(parseLatestVerdict(window.localStorage.getItem(LATEST_VERDICT_KEY)));
      } catch {
        // Storage can throw outright (Safari private mode, blocked cookies).
        setState(null);
      }
    }
    read();

    function onStorage(e: StorageEvent) {
      // key === null means the whole store was cleared.
      if (e.key === null || e.key === LATEST_VERDICT_KEY) read();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(PHASE0_EVENT, read);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PHASE0_EVENT, read);
    };
  }, []);

  return state;
}

/**
 * Publish the verdict accent to the document root. Called once from AppSidebar
 * so the rail and the drawer can never disagree about the active color.
 */
export function useVerdictAccent(state: LatestVerdict | null): void {
  useEffect(() => {
    const root = document.documentElement;
    if (!state) {
      // Fall back to the :root defaults rather than pinning a stale color.
      root.style.removeProperty("--sidebar-verdict-color");
      root.style.removeProperty("--sidebar-verdict-tint");
      return;
    }
    const { color } = VERDICT_META[state.verdict];
    root.style.setProperty("--sidebar-verdict-color", color);
    root.style.setProperty("--sidebar-verdict-tint", withAlpha(color, 0.06));
  }, [state]);
}

/**
 * Presentation model for the sidebar *footer* readiness chip.
 *
 * Lives here, beside the verdict parsing, rather than inside AppSidebar's JSX:
 * the routing target and the announced name are the two things worth pinning in
 * a test, and doing that here costs no shell mount (AppSidebar drags in
 * usePathname + framer-motion).
 */
export type FooterChipModel = {
  /** /dashboard once there is a score (Build), /assessment before that. */
  href: string;
  /** Verdict color, or null in the empty state — the chip then inherits the
   *  --sidebar-verdict-color default published by :root. */
  color: string | null;
  /** Score glyph. An em dash when nothing has been assessed yet. */
  score: string;
  label: string;
  /** Dim second line, or null when there is nothing to add. */
  meta: string | null;
  /** Accessible name for the link — the chip's own text is decorative, and at
   *  rail width most of it is not painted at all. */
  ariaLabel: string;
};

export function footerChipModel(state: LatestVerdict | null): FooterChipModel {
  const meta = state ? VERDICT_META[state.verdict] : null;

  if (!state || !meta) {
    return {
      href: "/assessment",
      color: null,
      score: "—",
      label: "Assess",
      meta: "No score yet",
      ariaLabel: "No readiness score yet — start an assessment",
    };
  }

  return {
    href: "/dashboard",
    color: meta.color,
    score: String(state.score),
    label: meta.label,
    meta: state.heldDays === null ? null : `Held ${state.heldDays}d`,
    ariaLabel: `Readiness score ${state.score}, ${meta.label}. Continue on HōMI.`,
  };
}

/** Sidebar header block: verdict pill, score hero, decision + hold eyebrow. */
export function SidebarDecisionState({
  state,
  expanded,
}: {
  state: LatestVerdict | null;
  /** The drawer is always expanded; the desktop rail collapses below xl. */
  expanded: boolean;
}) {
  // Collapse to icon-rail width below xl: labels go screen-reader-only so the
  // verdict is still announced, and only the score number stays visible.
  const railHidden = expanded ? "" : "max-xl:sr-only";
  const meta = state ? VERDICT_META[state.verdict] : null;

  if (!state || !meta) {
    return (
      <div className={`sidebar-state-block ${expanded ? "sidebar-state-block--expanded" : ""}`}>
        <p className="sidebar-state-empty">
          <span aria-hidden>—</span>
          <span className={railHidden}> Assess to begin</span>
        </p>
      </div>
    );
  }

  const eyebrow = [state.decisionType, state.heldDays === null ? null : `${state.heldDays}d`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`sidebar-state-block ${expanded ? "sidebar-state-block--expanded" : ""}`}>
      <span
        className={`sidebar-state-badge ${railHidden}`}
        style={{ color: meta.color, background: withAlpha(meta.color, 0.14) }}
      >
        {meta.label}
      </span>
      <p className="sidebar-score-hero" style={{ color: meta.color }}>
        {state.score}
      </p>
      {eyebrow && <p className={`sidebar-state-meta ${railHidden}`}>{eyebrow}</p>}
    </div>
  );
}

/**
 * Thin three-cell data strip above the sidebar footer. Score and Held come
 * from the cached verdict; the 7-day check-in pulse has no client-side source
 * yet and stays a placeholder until a later pass wires it.
 */
export function SidebarPulseStrip({
  state,
  expanded,
}: {
  state: LatestVerdict | null;
  expanded: boolean;
}) {
  const cells: readonly { label: string; value: string }[] = [
    { label: "Score", value: state ? String(state.score) : "—" },
    { label: "Pulse·7d", value: "—" },
    { label: "Held", value: state?.heldDays == null ? "—" : `${state.heldDays}d` },
  ];

  return (
    <div className={`sidebar-pulse-strip ${expanded ? "" : "max-xl:hidden"}`}>
      {cells.map((cell) => (
        <div key={cell.label} className="sidebar-pulse-cell">
          <span className="sidebar-pulse-label">{cell.label}</span>
          <span className="sidebar-pulse-value">{cell.value}</span>
        </div>
      ))}
    </div>
  );
}
