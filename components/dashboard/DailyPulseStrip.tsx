import { COLORS, withAlpha } from "@/lib/brand";
import type { DailyCheckin } from "@/types/database";

const WIDTH = 640;
const HEIGHT = 132;
const PAD_TOP = 14;
const PAD_BOTTOM = 24;
const PAD_LEFT = 16;
/** Right gutter reserved for the inline series labels. */
const LABEL_GUTTER = 64;

/**
 * Server-safe mood vs. financial-stress trend over recent check-ins.
 *
 * Honesty and accessibility upgrades over v1:
 *  · x positions are time-weighted — a two-week gap *looks* like a gap
 *    instead of pretending check-ins were evenly spaced.
 *  · Series are dual-encoded (solid vs. dashed + inline end labels), so the
 *    emerald/crimson pair survives red-green color blindness.
 *  · Mood carries a soft gradient area (the Sparkline language); stress stays
 *    a bare dashed line so the two never read as one shape.
 */
export function DailyPulseStrip({ checkins }: { checkins: DailyCheckin[] }) {
  if (checkins.length === 0) {
    return (
      <p className="text-sm text-dim">
        No check-ins yet. A 60-second daily check-in builds a picture of how you&rsquo;re really
        doing.
      </p>
    );
  }

  const ordered = [...checkins].reverse();
  const chartWidth = WIDTH - PAD_LEFT - LABEL_GUTTER;
  const chartHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const baseline = PAD_TOP + chartHeight;

  const times = ordered.map((c) => new Date(c.created_at).getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const span = tMax - tMin;

  const xFor = (i: number) =>
    ordered.length === 1 || span === 0
      ? PAD_LEFT + chartWidth / 2
      : PAD_LEFT + ((times[i] - tMin) / span) * chartWidth;
  const yFor = (value: number) => PAD_TOP + chartHeight - (value / 10) * chartHeight;

  const moodPts = ordered.map((c, i) => [xFor(i), yFor(c.mood)] as const);
  const stressPts = ordered.map((c, i) => [xFor(i), yFor(c.financial_stress)] as const);
  const toStr = (pts: ReadonlyArray<readonly [number, number]>) =>
    pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  const moodLine = toStr(moodPts);
  const stressLine = toStr(stressPts);
  const moodArea = `${moodPts[0][0].toFixed(1)},${baseline} ${moodLine} ${moodPts[moodPts.length - 1][0].toFixed(1)},${baseline}`;

  const [moodEndX, moodEndY] = moodPts[moodPts.length - 1];
  const [stressEndX, stressEndY] = stressPts[stressPts.length - 1];
  // Nudge the inline labels apart when the lines end close together.
  let moodLabelY = moodEndY;
  let stressLabelY = stressEndY;
  if (Math.abs(moodLabelY - stressLabelY) < 14) {
    if (moodLabelY <= stressLabelY) {
      moodLabelY -= (14 - Math.abs(moodEndY - stressEndY)) / 2;
      stressLabelY += (14 - Math.abs(moodEndY - stressEndY)) / 2;
    } else {
      moodLabelY += (14 - Math.abs(moodEndY - stressEndY)) / 2;
      stressLabelY -= (14 - Math.abs(moodEndY - stressEndY)) / 2;
    }
  }

  const fmtDate = (t: number) =>
    new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label={`Mood and financial stress across ${ordered.length} check-in${ordered.length === 1 ? "" : "s"}, ${fmtDate(tMin)} to ${fmtDate(tMax)}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="pulse-mood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.emerald} stopOpacity="0.22" />
            <stop offset="100%" stopColor={COLORS.emerald} stopOpacity="0" />
          </linearGradient>
        </defs>

        <polygon points={moodArea} fill="url(#pulse-mood)" />
        <polyline
          points={moodLine}
          fill="none"
          stroke={COLORS.emerald}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={stressLine}
          fill="none"
          stroke={COLORS.crimson}
          strokeWidth="2.5"
          strokeDasharray="6 5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />

        {/* Endpoint markers + inline labels — legible without color. */}
        <circle
          cx={moodEndX}
          cy={moodEndY}
          r="3"
          fill={COLORS.emerald}
          style={{ filter: `drop-shadow(0 0 4px ${COLORS.emerald})` }}
        />
        <circle
          cx={stressEndX}
          cy={stressEndY}
          r="3"
          fill={COLORS.crimson}
          style={{ filter: `drop-shadow(0 0 4px ${COLORS.crimson})` }}
        />
        <text
          x={moodEndX + 8}
          y={moodLabelY + 3.5}
          fontSize="10"
          fill={COLORS.emerald}
          fontFamily="var(--font-sans)"
        >
          Mood
        </text>
        <text
          x={stressEndX + 8}
          y={stressLabelY + 3.5}
          fontSize="10"
          fill={COLORS.crimson}
          fontFamily="var(--font-sans)"
        >
          Stress
        </text>

        {/* Time context. */}
        <text
          x={PAD_LEFT}
          y={HEIGHT - 8}
          fontSize="9"
          fill={withAlpha(COLORS.dim, 0.7)}
          fontFamily="var(--font-sans)"
        >
          {fmtDate(tMin)}
        </text>
        {span > 0 && (
          <text
            x={PAD_LEFT + chartWidth}
            y={HEIGHT - 8}
            textAnchor="end"
            fontSize="9"
            fill={withAlpha(COLORS.dim, 0.7)}
            fontFamily="var(--font-sans)"
          >
            {fmtDate(tMax)}
          </text>
        )}
      </svg>
      <div className="mt-3 flex gap-6 text-xs text-dim">
        <span className="flex items-center gap-2">
          <svg width="18" height="6" aria-hidden="true">
            <line
              x1="0"
              y1="3"
              x2="18"
              y2="3"
              stroke={COLORS.emerald}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          Mood
        </span>
        <span className="flex items-center gap-2">
          <svg width="18" height="6" aria-hidden="true">
            <line
              x1="0"
              y1="3"
              x2="18"
              y2="3"
              stroke={COLORS.crimson}
              strokeWidth="2.5"
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
          </svg>
          Financial stress
        </span>
        <span className="ml-auto">
          {checkins.length} check-in{checkins.length === 1 ? "" : "s"} logged
        </span>
      </div>
    </div>
  );
}
