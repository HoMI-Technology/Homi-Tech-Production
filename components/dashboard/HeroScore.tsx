"use client";

import { useEffect, useState } from "react";
import { useCountUp } from "@/components/ui/count-up";
import { entranceShouldPlay } from "./entrance-state";

/**
 * The verdict hero numeral. On the session's first dashboard visit it performs
 * the house overshoot-and-settle count-up, timed to land as the entrance stage
 * reveals; on repeat visits, reduced motion, or no-JS it renders the value
 * statically (the server HTML already carries it).
 *
 * CLS-safe: an invisible copy of the final value reserves the exact box.
 * A11y-safe: the animating numeral is aria-hidden; screen readers get only the
 * final value.
 */
export function HeroScore({ value, color }: { value: number; color: string }) {
  const [play, setPlay] = useState(false);
  useEffect(() => {
    setPlay(entranceShouldPlay());
  }, []);

  const display = useCountUp(value, { durationMs: 2000, delayMs: 400, play });

  return (
    <span
      className="score-numeral relative inline-block font-bold text-light"
      style={{
        fontSize: "clamp(4rem, 8vw, 6rem)",
        letterSpacing: "-0.04em",
        lineHeight: "1",
        // Stronger glow than the original — score is the dominant instrument
        textShadow: `0 0 60px ${color}66`,
      }}
    >
      {/* Sizing ghost — reserves the final width so counting never shifts layout. */}
      <span aria-hidden className="invisible">
        {value}
      </span>
      <span aria-hidden className="absolute inset-0">
        {play ? Math.round(display) : value}
      </span>
      <span className="sr-only">{`Overall HōMI-Score ${value} out of 100`}</span>
    </span>
  );
}
