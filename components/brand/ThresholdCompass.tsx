import { COLORS } from "@/lib/brand";

const VERDICT_COLORS: Record<string, string> = {
  READY: COLORS.emerald,
  ALMOST_THERE: COLORS.yellow,
  BUILD_FIRST: COLORS.amber,
  NOT_YET: COLORS.crimson,
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
  verdict?: "READY" | "ALMOST_THERE" | "BUILD_FIRST" | "NOT_YET";
  glow?: boolean;
  className?: string;
}) {
  const pip = verdict ? VERDICT_COLORS[verdict] : COLORS.yellow;
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

      <g className={animated ? "ring-outer" : undefined} filter="url(#hc-glow)">
        <circle cx="100" cy="100" r="85" stroke={COLORS.cyan} strokeWidth="2" fill="none" opacity="0.65" />
        <circle cx="160.1" cy="39.9" r="3" fill={COLORS.cyan} />
        <circle cx="160.1" cy="160.1" r="3" fill={COLORS.cyan} />
        <circle cx="39.9" cy="160.1" r="3" fill={COLORS.cyan} />
        <circle cx="39.9" cy="39.9" r="3" fill={COLORS.cyan} />
      </g>

      <g className={animated ? "ring-middle" : undefined} filter="url(#hc-glow)">
        <circle cx="100" cy="100" r="60" stroke={COLORS.emerald} strokeWidth="2" fill="none" opacity="0.75" />
        <circle cx="100" cy="40" r="2.5" fill={COLORS.emerald} />
        <circle cx="160" cy="100" r="2.5" fill={COLORS.emerald} />
        <circle cx="100" cy="160" r="2.5" fill={COLORS.emerald} />
        <circle cx="40" cy="100" r="2.5" fill={COLORS.emerald} />
      </g>

      <g className={animated ? "ring-inner" : undefined} filter="url(#hc-glow)">
        <circle cx="100" cy="100" r="35" stroke={COLORS.yellow} strokeWidth="2" fill="none" opacity="0.85" />
      </g>

      <g filter="url(#hc-glow)">
        <circle cx="100" cy="96" r="5" fill="none" stroke={unlocked ? COLORS.emerald : COLORS.yellow} strokeWidth="2" />
        <rect x="97" y="96" width="6" height="12" rx="2" fill="none" stroke={unlocked ? COLORS.emerald : COLORS.yellow} strokeWidth="2" />
        <circle cx="100" cy="96" r="6" fill={pip} />
        <rect x="97" y="96" width="6" height="12" fill={unlocked ? COLORS.emerald : COLORS.yellow} />
      </g>
    </svg>
  );
}
