"use client";

import { useEffect, useRef, useState } from "react";

/** Fraction of the total duration spent on the "count up past target" phase. */
const PHASE_1_RATIO = 0.7;
/** How many points past the target value phase 1 overshoots to. */
const OVERSHOOT = 2;

/**
 * Animated count-up to the final score, respecting prefers-reduced-motion.
 * Two-phase "overshoot and settle" motion totaling ~2000ms by default:
 * phase 1 counts up PAST the target (fast ease-out to value + OVERSHOOT),
 * phase 2 eases back down to the exact value (ease-in-out cubic) — a small
 * spring-landing settle, not a bounce.
 */
export function CountUpScore({ value, durationMs = 2000 }: { value: number; durationMs?: number }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      return;
    }

    const overshootValue = value + OVERSHOOT;
    const phase1Duration = Math.max(1, durationMs * PHASE_1_RATIO);
    const phase2Duration = Math.max(1, durationMs - phase1Duration);

    let raf: number;
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;

      if (elapsed < phase1Duration) {
        // Phase 1 — fast ease-out count-up past the target.
        const progress = Math.min(1, elapsed / phase1Duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * overshootValue * 10) / 10);
        raf = requestAnimationFrame(tick);
        return;
      }

      // Phase 2 — ease-in-out settle back down from the overshoot to the exact value.
      const phase2Elapsed = elapsed - phase1Duration;
      const progress = Math.min(1, phase2Elapsed / phase2Duration);
      const eased = progress < 0.5 ? 4 * Math.pow(progress, 3) : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const current = overshootValue - (overshootValue - value) * eased;
      setDisplay(Math.round(current * 10) / 10);

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return (
    <span className="score-numeral font-bold text-light" style={{ fontSize: "clamp(72px, 14vw, 128px)", lineHeight: 1 }}>
      {display}
    </span>
  );
}
