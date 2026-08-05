"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { PulseDot } from "@/components/ui/PulseDot";
import { COLORS, VERDICT_META } from "@/lib/brand";
import { withAlpha } from "@/lib/brand";
import type { AssessmentResult } from "@/lib/scoring/engine";
import type { PillarKey } from "./readiness-types";

const CYAN = COLORS.cyan;
const EMERALD = COLORS.emerald;
const YELLOW = COLORS.yellow;
const NAVY = COLORS.navy;

type RingSpec = {
  radius: number;
  color: string;
  opacity: number;
  duration: number;
  direction: "cw" | "ccw";
  dots: { cx: number; cy: number; r: number }[];
};

/**
 * Canonical ring table — 4:3:2 ratio, never reorder/recolor.
 * Outer cyan (Financial Reality) · Middle emerald (Emotional Truth) · Inner yellow (Perfect Timing).
 */
const RINGS: RingSpec[] = [
  {
    radius: 85,
    color: CYAN,
    opacity: 0.6,
    duration: 20,
    direction: "cw",
    dots: [
      { cx: 160.1, cy: 39.9, r: 3 },
      { cx: 160.1, cy: 160.1, r: 3 },
      { cx: 39.9, cy: 160.1, r: 3 },
      { cx: 39.9, cy: 39.9, r: 3 },
    ],
  },
  {
    radius: 60,
    color: EMERALD,
    opacity: 0.7,
    duration: 15,
    direction: "ccw",
    dots: [
      { cx: 100, cy: 40, r: 2.5 },
      { cx: 160, cy: 100, r: 2.5 },
      { cx: 100, cy: 160, r: 2.5 },
      { cx: 40, cy: 100, r: 2.5 },
    ],
  },
  { radius: 35, color: YELLOW, opacity: 0.8, duration: 10, direction: "cw", dots: [] },
];

const PILLAR_ORDER: PillarKey[] = ["financial", "emotional", "timing"];

/**
 * One compass ring group — full circle + dots that rotate WITH the ring.
 * Perpetual linear spin is isolated here so parent re-renders never reset it.
 */
const CompassRing = memo(function CompassRing({
  radius,
  color,
  opacity,
  duration,
  direction,
  dots,
}: RingSpec) {
  return (
    <g
      className="compass-ring-spin"
      style={{
        animationDuration: `${duration}s`,
        animationDirection: direction === "ccw" ? "reverse" : "normal",
      }}
    >
      <circle
        cx={100}
        cy={100}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={2}
        opacity={opacity}
      />
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={color} />
      ))}
    </g>
  );
});

/**
 * Canonical keyhole center (exact geometry from the master SVG).
 * Default yellow; UNLOCKED (READY) → emerald treatment + gentle 2s pulse —
 * "the compass becomes a key."
 */
function Keyhole({ unlocked }: { unlocked: boolean }) {
  const color = unlocked ? EMERALD : YELLOW;
  return (
    <g
      className={unlocked ? "compass-keyhole-pulse" : undefined}
      style={{
        filter: `drop-shadow(0 0 12px ${withAlpha(color, unlocked ? 0.55 : 0.5)})`,
      }}
    >
      <circle cx={100} cy={96} r={12} stroke={color} strokeWidth={2} fill="none" />
      <rect x={94} y={104} width={12} height={16} rx={2} stroke={color} strokeWidth={2} fill="none" />
      <circle cx={100} cy={96} r={5} fill={color} />
      <rect x={97} y={96} width={6} height={12} fill={color} />
    </g>
  );
}

/**
 * Threshold Compass hero — canonical geometry (200×200 viewBox).
 * Three complete counter-rotating rings, keyhole center, verdict pip
 * (the ONLY place verdict color appears inside the compass),
 * spring HōMI-Score below, crossfading verdict chip + canon line.
 */
export function ThresholdCompass({ result }: { result: AssessmentResult }) {
  const { score, verdict } = result;
  const meta = VERDICT_META[verdict];
  const color = meta.color;
  const ready = verdict === "READY";

  return (
    <div
      className="glass relative flex flex-col items-center overflow-hidden p-6"
      style={{ borderTopColor: withAlpha(COLORS.cyan, 0.25) }}
    >
      <style>{`
        @keyframes compass-ring-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .compass-ring-spin {
          animation-name: compass-ring-rotate;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes compass-keyhole-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .compass-keyhole-pulse { animation: compass-keyhole-pulse 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .compass-ring-spin, .compass-keyhole-pulse { animation: none; }
        }
      `}</style>

      <div className="flex w-full items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-dim">
          HōMI-Score
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest text-dim">
          35 · 35 · 30
        </span>
      </div>

      <svg
        viewBox="0 0 200 200"
        className="compass-glow mt-2 w-full max-w-[300px]"
        role="img"
        aria-label="HōMI Threshold Compass showing Financial Reality, Emotional Truth, and Perfect Timing around the user at the decision threshold."
      >
        <defs>
          <radialGradient id="keyhole-halo">
            <stop offset="0%" stopColor={ready ? EMERALD : YELLOW} stopOpacity="0.28" />
            <stop offset="70%" stopColor={ready ? EMERALD : YELLOW} stopOpacity="0" />
          </radialGradient>
        </defs>

        {RINGS.map((ring, i) => (
          <CompassRing key={i} {...ring} />
        ))}

        {/* soft halo behind the keyhole */}
        <circle cx={100} cy={100} r={30} fill="url(#keyhole-halo)" />

        <Keyhole unlocked={ready} />

        {/* verdict pip — the only verdict color inside the compass */}
        <circle cx={100} cy={100} r={6} fill={color} stroke={NAVY} strokeWidth={2} />
      </svg>

      <AnimatedNumber
        value={score}
        format={(n) => n.toFixed(1)}
        className="mt-2 font-score text-5xl font-medium leading-none tabular-nums text-light"
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={verdict}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mt-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ backgroundColor: withAlpha(color, 0.1), color }}
        >
          <PulseDot color={color} size={5} />
          {meta.label}
        </motion.span>
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={verdict}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-2 text-center font-display text-[17px] italic text-dim"
        >
          {meta.line}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export default ThresholdCompass;
