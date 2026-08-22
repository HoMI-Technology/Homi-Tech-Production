"use client";

import { useEffect } from "react";
import type { ScoreImpactSnapshot } from "@/lib/planner/types";

/**
 * PLANNER ImpactToast — the closed-loop score-impact toast for the Budget
 * Planner / Money · Track workspace. It reads `usePlannerStore.lastImpact`
 * (set by lib/planner/closed-loop.ts after a score-mutating action) and
 * renders a fixed bottom-right card with the before/after score.
 *
 * NOT the same as components/readiness/ImpactToast.tsx — that one is the
 * layout-mounted Path-to-Ready impact toast driven by the homi:impact:v1
 * event bus and the unified ToastProvider. Both are intentionally live;
 * check both import sites before merging or renaming either one.
 */
export function ImpactToast({
  impact,
  onDismiss,
}: {
  impact: ScoreImpactSnapshot | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!impact) return;
    const t = window.setTimeout(onDismiss, 8_000);
    return () => window.clearTimeout(t);
  }, [impact, onDismiss]);

  if (!impact) return null;

  const delta =
    Math.abs(impact.delta) < 0.05
      ? "0.0"
      : `${impact.delta > 0 ? "+" : ""}${impact.delta.toFixed(1)}`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 w-[min(100vw-2rem,22rem)] rounded-xl border border-cyan/40 bg-navy/95 p-4 shadow-lg backdrop-blur"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-3xs uppercase tracking-wider text-cyan">
            Closed loop · {impact.actionKind ?? "update"}
          </p>
          <p className="mt-1 text-sm font-medium text-light">{impact.headline ?? impact.reason}</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          className="text-dim hover:text-light"
          onClick={onDismiss}
        >
          ×
        </button>
      </div>
      <p className="mt-2 font-score text-2xl tabular-nums text-light">
        {impact.fromScore.toFixed(0)} → {impact.toScore.toFixed(0)}{" "}
        <span className="text-base text-dim">({delta})</span>
      </p>
      <p className="mt-2 text-xs leading-relaxed text-dim">{impact.detail}</p>
      {impact.nextHint && <p className="mt-2 text-xs text-cyan/90">→ {impact.nextHint}</p>}
    </div>
  );
}
