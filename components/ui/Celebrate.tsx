"use client";

import { useEffect, useState } from "react";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";

const VISIBLE_MS = 3000;

/**
 * Celebrate — a reusable "quiet light" celebration: a small emerald
 * ThresholdCompass with a keyhole glint plus a subtle ring-brighten,
 * auto-fading out after ~3s. No confetti, no emoji, nothing bouncy or loud.
 *
 * Visibility duration is driven by a JS timeout (not CSS animation timing),
 * so it holds for the same ~3s window regardless of prefers-reduced-motion.
 * The ring-brighten and keyhole-glint themselves collapse to a static glow
 * (no flashing) under reduced motion via the global CSS reduced-motion
 * block in app/globals.css, which is exactly the "static fallback" this
 * needs — no duplicate logic required here.
 *
 * Usable inline or centered; the caller owns layout/wrapping.
 */
export function Celebrate({
  active,
  label,
  onDone,
}: {
  active: boolean;
  label?: string;
  onDone?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [lit, setLit] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      setLit(false);
      return;
    }

    setVisible(true);
    // Defer to the next frame so the ring-brighten transition has a
    // "from" state to animate out of (skipped entirely under reduced motion).
    const raf = window.requestAnimationFrame(() => setLit(true));
    const timeout = window.setTimeout(() => {
      setVisible(false);
      setLit(false);
      onDone?.();
    }, VISIBLE_MS);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!visible) return null;

  return (
    <div aria-live="polite" className="flex flex-col items-center gap-3 text-center">
      <div className={`celebrate-ring keyhole-glint inline-flex rounded-full ${lit ? "is-active" : ""}`}>
        <ThresholdCompass size={64} verdict="READY" glow animated />
      </div>
      {label && <p className="max-w-xs text-sm text-emerald">{label}</p>}
    </div>
  );
}
