/**
 * HōMI Threshold Compass — the signature mark. Canonical geometry:
 *   viewBox 200×200, rings r=85/60/35 (ratio 4:3:2)
 *   Outer  cyan    #22d3ee  op .6  20s clockwise
 *   Middle emerald #34d399  op .7  15s counter-clockwise
 *   Inner  yellow  #facc15  op .8  10s clockwise
 *   Center keyhole yellow; pip r=6 is the ONLY place verdict color appears.
 * Linear motion only. Reduced motion → static (handled in globals.css).
 */

const VERDICT_COLORS: Record<string, string> = {
  READY: "#34d399",
  ALMOST_THERE: "#facc15",
  BUILD_FIRST: "#fab633",
  NOT_YET: "#f24822",
};

export function ThresholdCompass({
  size = 320,
  animated = true,
  verdict,
  glow = true,
  className = "",
}: {
  size?: number;
  animated?: boolean;
  /** When set, the center pip takes the verdict color (only place it appears). */
  verdict?: "READY" | "ALMOST_THERE" | "BUILD_FIRST" | "NOT_YET";
  glow?: boolean;
  className?: string;
}) {
  const pip = verdict ? VERDICT_COLORS[verdict] : "#facc15";
  const unlocked = verdict === "READY";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`${glow ? "compass-glow" : ""} ${className}`}
      role="img"
      aria-label="HōMI Threshold Compass showing Financial Reality, Emotional Truth, and Perfect Timing around the user at the decision threshold."
    >
      <defs>
        <filter id="hc-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer ring — Financial Reality, cyan, 20s CW */}
      <g className={animated ? "ring-outer" : undefined} filter="url(#hc-glow)">
        <circle cx="100" cy="100" r="85" stroke="#22d3ee" strokeWidth="2" fill="none" opacity="0.6" />
        <circle cx="160.1" cy="39.9" r="3" fill="#22d3ee" />
        <circle cx="160.1" cy="160.1" r="3" fill="#22d3ee" />
        <circle cx="39.9" cy="160.1" r="3" fill="#22d3ee" />
        <circle cx="39.9" cy="39.9" r="3" fill="#22d3ee" />
      </g>

      {/* Middle ring — Emotional Truth, emerald, 15s CCW */}
      <g className={animated ? "ring-middle" : undefined} filter="url(#hc-glow)">
        <circle cx="100" cy="100" r="60" stroke="#34d399" strokeWidth="2" fill="none" opacity="0.7" />
        <circle cx="100" cy="40" r="2.5" fill="#34d399" />
        <circle cx="160" cy="100" r="2.5" fill="#34d399" />
        <circle cx="100" cy="160" r="2.5" fill="#34d399" />
        <circle cx="40" cy="100" r="2.5" fill="#34d399" />
      </g>

      {/* Inner ring — Perfect Timing, yellow, 10s CW */}
      <g className={animated ? "ring-inner" : undefined} filter="url(#hc-glow)">
        <circle cx="100" cy="100" r="35" stroke="#facc15" strokeWidth="2" fill="none" opacity="0.8" />
      </g>

      {/* Center keyhole — yellow; emerald treatment when unlocked (READY) */}
      <g filter="url(#hc-glow)">
        <circle
          cx="100"
          cy="96"
          r="12"
          fill="none"
          stroke={unlocked ? "#34d399" : "#facc15"}
          strokeWidth="2"
        />
        <rect
          x="94"
          y="104"
          width="12"
          height="16"
          rx="2"
          fill="none"
          stroke={unlocked ? "#34d399" : "#facc15"}
          strokeWidth="2"
        />
        {/* Explicit pip r=6 — the only place verdict color appears */}
        <circle cx="100" cy="96" r="6" fill={pip} />
        <rect x="97" y="96" width="6" height="12" fill={unlocked ? "#34d399" : "#facc15"} />
      </g>
    </svg>
  );
}
