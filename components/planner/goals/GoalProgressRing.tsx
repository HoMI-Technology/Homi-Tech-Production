"use client";

/**
 * Goal progress ring — the funded share of one savings goal, drawn.
 *
 * The number is always the goal's real current/target ratio, computed in
 * goals-derive.goalRow from ledger fields; this component only draws it and
 * never derives its own. Colour is a status read, not decoration: canon
 * emerald while a goal is on pace or funded, HōMI amber only when
 * goals-derive has already ruled the goal "behind" (a real target date the
 * planned monthly pace will miss). No other status is invented here.
 *
 * framer-motion draws the arc in on mount; under prefers-reduced-motion the
 * final arc renders immediately with no animation.
 */

import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { COLORS, withAlpha } from "@/lib/brand";

const VIEWBOX = 64;
const R = 26;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Emerald on pace / funded; amber only for goals-derive's existing "behind" ruling. */
export function goalProgressColor(behind: boolean): string {
  return behind ? COLORS.amber : COLORS.emerald;
}

export function GoalProgressRing({
  pct,
  behind,
  size = 64,
  label,
}: {
  /** 0–100, already capped by goals-derive. */
  pct: number;
  /** goals-derive's ruling: the planned pace misses a real target date. */
  behind: boolean;
  size?: number;
  label?: string;
}) {
  const reducedMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, pct));
  const targetOffset = CIRCUMFERENCE * (1 - clamped / 100);
  const stroke = goalProgressColor(behind);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${clamped}% funded`}
      data-testid="goal-progress-ring"
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} width={size} height={size} aria-hidden>
        <circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={R}
          fill="none"
          stroke={withAlpha(COLORS.slateHigh, 0.45)}
          strokeWidth="6"
        />
        <motion.circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={reducedMotion ? false : { strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={
            reducedMotion ? { duration: 0 } : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
          }
          transform={`rotate(-90 ${VIEWBOX / 2} ${VIEWBOX / 2})`}
        />
      </svg>
      <span
        aria-hidden
        className="score-numeral absolute inset-0 flex items-center justify-center font-semibold text-light"
        style={{ fontSize: size * 0.22 }}
      >
        {clamped}%
      </span>
    </div>
  );
}
