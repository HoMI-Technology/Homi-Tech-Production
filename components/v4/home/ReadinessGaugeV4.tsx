import { COLORS, withAlpha } from "@/lib/brand";

const SIZE = 176;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 68;
const TRACK_WIDTH = 10;
const TICK_COUNT = 24;

function ticks() {
  const marks: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
  for (let i = 0; i < TICK_COUNT; i += 1) {
    const angle = (Math.PI * 2 * i) / TICK_COUNT - Math.PI / 2;
    const major = i % 6 === 0;
    const inner = RADIUS + 10;
    const outer = major ? RADIUS + 18 : RADIUS + 15;
    marks.push({
      x1: CX + Math.cos(angle) * inner,
      y1: CY + Math.sin(angle) * inner,
      x2: CX + Math.cos(angle) * outer,
      y2: CY + Math.sin(angle) * outer,
      major,
    });
  }
  return marks;
}

const TICKS = ticks();

/**
 * Proprietary readiness instrument — not ThresholdCompass, not a chart lib.
 * Dark track + cyan arc + ticks. Numeral is JetBrains; no count-up.
 */
export function ReadinessGaugeV4({
  scorePct,
  scoreAge,
  scoreLabel,
}: {
  scorePct: number | null;
  scoreAge: string | null;
  scoreLabel: string;
}) {
  const circ = 2 * Math.PI * RADIUS;
  const pct =
    scorePct != null && Number.isFinite(scorePct)
      ? Math.max(0, Math.min(1, scorePct / 100))
      : 0;
  const dash = circ * pct;
  const numeral = scorePct != null ? String(scorePct) : "\u2014";

  return (
    <div className="v4-gauge" data-home-v4-gauge="" data-home-v4-score-plate="">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        aria-hidden
        className="v4-gauge-svg"
      >
        <defs>
          <filter id="v4-gauge-bloom" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.1" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={CX} cy={CY} r={RADIUS - 8} fill={COLORS.navy} />
        <circle
          cx={CX}
          cy={CY}
          r={RADIUS}
          fill="none"
          stroke={withAlpha(COLORS.slateHigh, 0.45)}
          strokeWidth={TRACK_WIDTH}
        />
        <circle
          cx={CX}
          cy={CY}
          r={RADIUS}
          fill="none"
          stroke={COLORS.cyan}
          strokeWidth={TRACK_WIDTH}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform={`rotate(-90 ${CX} ${CY})`}
          filter="url(#v4-gauge-bloom)"
          opacity={0.95}
        />
        {TICKS.map((tick, index) => (
          <line
            key={index}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.major ? withAlpha(COLORS.light, 0.35) : withAlpha(COLORS.dim, 0.28)}
            strokeWidth={tick.major ? 1.5 : 1}
          />
        ))}
      </svg>
      <div className="v4-gauge-center">
        <span className="score-numeral v4-gauge-score" aria-label={scoreLabel} data-home-v4-score="">
          {numeral}
        </span>
        <span className="v4-gauge-denom" aria-hidden>
          /100
        </span>
        {scoreAge ? (
          <span className="v4-gauge-age" data-home-v4-age="">
            {scoreAge}
          </span>
        ) : null}
      </div>
    </div>
  );
}
