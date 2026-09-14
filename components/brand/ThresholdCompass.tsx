import { COLORS, type VerdictKey } from "@/lib/brand";

/** CANON compass alt — keep this string on every Threshold Compass `role="img"`. */
export const COMPASS_ARIA_LABEL =
  "HōMI Threshold Compass showing Financial Reality, Emotional Truth, and Perfect Timing around the user at the decision threshold.";

/**
 * Threshold Compass — canonical orbit/keyhole system.
 *
 * Rebuilt 2026-09-14 against the canonical spec (compass-spec.md +
 * assets/compass-canonical.png) and the source-lock facts
 * (app-sidebar/brand-compass-glow-filter-respects-prop):
 *  - Orbit/keyhole system. NEVER tick marks, a needle, or N/S/E/W letters.
 *  - Outer cyan orbit (Financial Reality), r=85, four CARDINAL nodes
 *    (top/right/bottom/left — not diagonals).
 *  - Middle emerald orbit (Emotional Truth), r=60, four smaller cardinal nodes.
 *  - Inner yellow orbit (Perfect Timing), r=35, no nodes, thicker stroke,
 *    brighter glow.
 *  - Keyhole center: small yellow ring + filled keyhole (circle over narrow
 *    rounded stem). The keyhole is the threshold symbol — strongest glow.
 *  - Verdicts are UI overlays, never recolors of compass elements:
 *    READY pulses the emerald orbit, ALMOST_THERE pulses the yellow orbit,
 *    BUILD_FIRST adds an amber halo, NOT_YET adds a crimson warning halo.
 *  - Glow is prop-driven (glow ? "url(#hc-glow)" : undefined); the hc-glow
 *    filter is only emitted when glow is on.
 *  - Motion is slow, ambient, and frozen under prefers-reduced-motion.
 *
 * All animation CSS is scoped and self-contained (tc-*) so this component
 * never depends on globals.css keyframes.
 */
export function ThresholdCompass({
  size = 320,
  animated = true,
  verdict,
  glow = true,
  className = "",
}: {
  size?: number;
  animated?: boolean;
  verdict?: VerdictKey;
  glow?: boolean;
  className?: string;
}) {
  const glowFilter = glow ? "url(#hc-glow)" : undefined;
  const keyholeGlow = glow ? "url(#tc-keyhole-glow)" : undefined;

  // READY pulses the emerald (Emotional Truth) orbit; ALMOST_THERE pulses the
  // yellow (Perfect Timing) orbit. BUILD_FIRST / NOT_YET get halo overlays.
  const middlePulse = verdict === "READY" ? " tc-pulse-emerald" : "";
  const innerPulse = verdict === "ALMOST_THERE" ? " tc-pulse-yellow" : "";
  const halo =
    verdict === "BUILD_FIRST"
      ? COLORS.amber
      : verdict === "NOT_YET"
        ? COLORS.crimson
        : null;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`tc-compass${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={COMPASS_ARIA_LABEL}
    >
      <style>{`
        .tc-compass .tc-outer { transform-origin: 100px 100px; animation: tc-spin-cw 24s linear infinite; }
        .tc-compass .tc-middle { transform-origin: 100px 100px; animation: tc-spin-ccw 18s linear infinite; }
        .tc-compass .tc-inner { transform-origin: 100px 100px; animation: tc-spin-cw 12s linear infinite; }
        .tc-compass .tc-pulse-emerald { animation: tc-spin-ccw 18s linear infinite, tc-pulse 3.2s ease-in-out infinite; }
        .tc-compass .tc-pulse-yellow { animation: tc-spin-cw 12s linear infinite, tc-pulse 3.2s ease-in-out infinite; }
        .tc-compass .tc-halo { animation: tc-pulse 3.6s ease-in-out infinite; }
        @keyframes tc-spin-cw { to { transform: rotate(360deg); } }
        @keyframes tc-spin-ccw { to { transform: rotate(-360deg); } }
        @keyframes tc-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
        @media (prefers-reduced-motion: reduce) {
          .tc-compass .tc-outer, .tc-compass .tc-middle, .tc-compass .tc-inner,
          .tc-compass .tc-pulse-emerald, .tc-compass .tc-pulse-yellow,
          .tc-compass .tc-halo { animation: none; }
        }
      `}</style>

      {glow ? (
        <defs>
          <filter id="hc-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="tc-keyhole-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      ) : null}

      {/* Verdict halo — UI overlay, not a compass element */}
      {halo ? (
        <circle
          data-testid="tc-verdict-halo"
          cx="100"
          cy="100"
          r="93"
          stroke={halo}
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
          className={animated ? "tc-halo" : undefined}
        />
      ) : null}

      {/* Outer orbit — Financial Reality (cyan), cardinal nodes */}
      <g className={animated ? "tc-outer" : undefined} filter={glowFilter}>
        <circle
          cx="100"
          cy="100"
          r="85"
          stroke={COLORS.cyan}
          strokeWidth="1.8"
          fill="none"
          opacity="0.7"
        />
        <circle cx="100" cy="15" r="3.2" fill={COLORS.cyan} />
        <circle cx="185" cy="100" r="3.2" fill={COLORS.cyan} />
        <circle cx="100" cy="185" r="3.2" fill={COLORS.cyan} />
        <circle cx="15" cy="100" r="3.2" fill={COLORS.cyan} />
      </g>

      {/* Middle orbit — Emotional Truth (emerald), smaller cardinal nodes */}
      <g
        className={animated ? `tc-middle${middlePulse}` : undefined}
        filter={glowFilter}
      >
        <circle
          cx="100"
          cy="100"
          r="60"
          stroke={COLORS.emerald}
          strokeWidth="1.8"
          fill="none"
          opacity="0.7"
        />
        <circle cx="100" cy="40" r="2.6" fill={COLORS.emerald} />
        <circle cx="160" cy="100" r="2.6" fill={COLORS.emerald} />
        <circle cx="100" cy="160" r="2.6" fill={COLORS.emerald} />
        <circle cx="40" cy="100" r="2.6" fill={COLORS.emerald} />
      </g>

      {/* Inner orbit — Perfect Timing (yellow), no nodes, brighter */}
      <g
        className={animated ? `tc-inner${innerPulse}` : undefined}
        filter={glowFilter}
      >
        <circle
          cx="100"
          cy="100"
          r="35"
          stroke={COLORS.yellow}
          strokeWidth="2.4"
          fill="none"
          opacity="0.85"
        />
      </g>

      {/* Keyhole center — the threshold symbol (strongest glow) */}
      <g filter={keyholeGlow}>
        <circle
          cx="100"
          cy="100"
          r="9"
          fill="none"
          stroke={COLORS.yellow}
          strokeWidth="1.6"
          opacity="0.95"
        />
        <circle cx="100" cy="97.6" r="3.4" fill={COLORS.yellow} />
        <rect x="98.3" y="99.6" width="3.4" height="6.8" rx="1.4" fill={COLORS.yellow} />
      </g>
    </svg>
  );
}
