import { COLORS, withAlpha } from "@/lib/brand";

/**
 * Shared premium daily bar chart for admin views — pure SVG, server-safe.
 * Gradient bars with rounded data-ends, native <title> tooltips, hairline
 * baseline. Replaces the per-page copies of AssessmentsBarChart /
 * ActivityBarChart.
 */
export function BarSeries({
  counts,
  color = COLORS.cyan,
  ariaLabel,
  id,
  height = 180,
}: {
  counts: { date: string; count: number }[];
  color?: string;
  ariaLabel: string;
  /** Unique per instance — namespaces the gradient id. */
  id: string;
  height?: number;
}) {
  const width = 720;
  const padding = 8;
  const labelSpace = 20;
  const max = Math.max(1, ...counts.map((c) => c.count));
  const barGap = 4;
  const barWidth = counts.length > 0 ? (width - padding * 2) / counts.length - barGap : 0;
  const gradId = `bars-${id}`;
  const baseY = height - padding - labelSpace;

  return (
    <div className="table-scroll w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.35" />
          </linearGradient>
        </defs>
        {counts.map((c, i) => {
          const barHeight = (c.count / max) * (baseY - padding);
          const x = padding + i * (barWidth + barGap);
          const y = baseY - barHeight;
          return (
            <g key={c.date}>
              <title>{`${c.date} — ${c.count}`}</title>
              {c.count > 0 ? (
                <rect
                  x={x}
                  y={y}
                  width={Math.max(barWidth, 1)}
                  height={Math.max(barHeight, 2)}
                  rx={Math.min(4, barWidth / 2)}
                  fill={`url(#${gradId})`}
                />
              ) : (
                <rect x={x} y={baseY - 2} width={Math.max(barWidth, 1)} height={2} rx={1} fill={COLORS.slateHigh} />
              )}
            </g>
          );
        })}
        <line
          x1={padding}
          y1={baseY}
          x2={width - padding}
          y2={baseY}
          stroke={withAlpha(COLORS.dim, 0.25)}
          strokeWidth={1}
        />
      </svg>
      <div className="mt-2 flex justify-between text-2xs text-dim">
        <span>{counts[0]?.date}</span>
        <span>{counts[counts.length - 1]?.date}</span>
      </div>
    </div>
  );
}
