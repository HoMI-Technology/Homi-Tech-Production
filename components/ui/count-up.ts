"use client";

import { useEffect, useRef, useState } from "react";

/** Fraction of the total duration spent on the "count up past target" phase. */
const PHASE_1_RATIO = 0.7;
/** How many points past the target value phase 1 overshoots to. */
const OVERSHOOT = 2;

/**
 * The house count-up motion — two-phase "overshoot and settle" (extracted from
 * the results hero so every numeral in the product lands the same way):
 * phase 1 counts fast past the target (ease-out to value + OVERSHOOT), phase 2
 * eases back down to the exact value. Returns the number to render.
 *
 * `play: false` — or prefers-reduced-motion — renders the target immediately.
 * The caller decides *whether* the theatre runs; this hook only knows *how*.
 * `delayMs` holds at the current value before starting, so a count can land in
 * step with an entrance stage.
 */
export function useCountUp(
  value: number,
  {
    durationMs = 2000,
    delayMs = 0,
    play = true,
  }: { durationMs?: number; delayMs?: number; play?: boolean } = {},
): number {
  const [display, setDisplay] = useState(value);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!play || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const overshootValue = value + OVERSHOOT;
    const phase1Duration = Math.max(1, durationMs * PHASE_1_RATIO);
    const phase2Duration = Math.max(1, durationMs - phase1Duration);

    let raf = 0;
    let timeout = 0;

    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;

      if (elapsed < phase1Duration) {
        const progress = Math.min(1, elapsed / phase1Duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * overshootValue * 10) / 10);
        raf = requestAnimationFrame(tick);
        return;
      }

      const phase2Elapsed = elapsed - phase1Duration;
      const progress = Math.min(1, phase2Elapsed / phase2Duration);
      const eased =
        progress < 0.5 ? 4 * Math.pow(progress, 3) : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const current = overshootValue - (overshootValue - value) * eased;
      setDisplay(Math.round(current * 10) / 10);

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    }

    const start = () => {
      startRef.current = null;
      setDisplay(0);
      raf = requestAnimationFrame(tick);
    };
    if (delayMs > 0) {
      timeout = window.setTimeout(start, delayMs);
    } else {
      start();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [value, durationMs, delayMs, play]);

  return display;
}
