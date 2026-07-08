import { VERDICT_META, type VerdictKey } from "@/lib/brand";

export interface ScoreHistoryPoint {
  score: number;
  verdict: VerdictKey;
  date: string; // ISO date
}

/**
 * Server-safe pure SVG bar chart of overall_score over time, colored
 * per verdict. No client hooks — renders identically on server and client.
 */
export function ScoreHistory({ points }: { points: ScoreHistoryPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-dim">
        No assessments yet — your score history will appear here.
      </div>
    );
  }

  const width = 640;
  const height = 160;
  const padding = 24;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barGap = 10;
  const barWidth = Math.max(6, chartWidth / points.length - barGap);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label="Score history over time"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Baseline grid at 50 and 80 (verdict thresholds) */}
      {[50, 65, 80].map((mark) => {
        const y = padding + chartHeight - (mark / 100) * chartHeight;
        return (
          <line
            key={mark}
            x1={padding}
            x2={width - padding}
            y1={y}
            y2={y}
            stroke="rgba(148,163,184,0.15)"
            strokeDasharray="4 4"
          />
        );
      })}

      {points.map((p, i) => {
        const x = padding + i * (barWidth + barGap);
        const barHeight = Math.max(2, (p.score / 100) * chartHeight);
        const y = padding + chartHeight - barHeight;
        const color = VERDICT_META[p.verdict]?.color ?? "#22d3ee";
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={color}
              opacity={0.85}
            />
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#94a3b8"
              fontFamily="var(--font-score)"
            >
              {p.score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
