"use client";

import { useCountUp } from "@/components/ui/count-up";

/**
 * Results-hero count-up. The motion itself (two-phase overshoot-and-settle,
 * reduced-motion aware) lives in the shared useCountUp hook so every numeral
 * in the product lands the same way; this component keeps the results page's
 * cinema-scale styling.
 */
export function CountUpScore({ value, durationMs = 2000 }: { value: number; durationMs?: number }) {
  const display = useCountUp(value, { durationMs });

  return (
    <span className="score-numeral font-bold text-light" style={{ fontSize: "clamp(72px, 14vw, 128px)", lineHeight: 1 }}>
      {display}
    </span>
  );
}
