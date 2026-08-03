"use client";

/**
 * Impact toast — Path closed-loop feedback.
 *
 * Sibling to SessionExpiredToast (glass, fixed bottom, dismiss).
 * Differences: role="status" (informational), auto-dismiss, flag-gated mount.
 * Does not claim score motion for Path steps.
 */

import { useCallback, useEffect, useState } from "react";
import {
  IMPACT_HYDRATE_TTL_MS,
  clearLastImpact,
  impactToastCopy,
  loadLastImpact,
  type ScoreImpact,
} from "@/lib/readiness/impact-bus";

const AUTO_DISMISS_MS = 5200;

export function ImpactToast() {
  const [impact, setImpact] = useState<ScoreImpact | null>(null);
  const [visible, setVisible] = useState(false);

  const show = useCallback((next: ScoreImpact) => {
    if (next.alreadyDone) return;
    if (next.v !== 1) return;
    setImpact(next);
    setVisible(true);
  }, []);

  useEffect(() => {
    const existing = loadLastImpact();
    if (existing && !existing.alreadyDone) {
      const age = Date.now() - Date.parse(existing.at);
      if (Number.isFinite(age) && age >= 0 && age < IMPACT_HYDRATE_TTL_MS) {
        show(existing);
      }
    }

    function onImpact(e: Event) {
      const detail = (e as CustomEvent<ScoreImpact>).detail;
      if (detail) show(detail);
    }
    window.addEventListener("homi:impact", onImpact);
    return () => window.removeEventListener("homi:impact", onImpact);
  }, [show]);

  useEffect(() => {
    if (!visible || !impact) return;
    const t = window.setTimeout(() => {
      setVisible(false);
      clearLastImpact();
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [visible, impact]);

  if (!visible || !impact) return null;

  const copy = impactToastCopy(impact);
  const borderClass =
    copy.tone === "progress" ? "border-emerald/35" : "border-white/15";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      <div
        className={`glass flex max-w-md flex-wrap items-start gap-3 p-4 sm:flex-nowrap ${borderClass}`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-light">{copy.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-dim">{copy.body}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            clearLastImpact();
          }}
          aria-label="Dismiss"
          className="btn btn-ghost shrink-0 !px-3 !py-2 text-sm"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
