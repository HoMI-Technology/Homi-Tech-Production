/** Simple 30-day bar chart, grouped by day in JS. No client JS required — pure SVG. */
export function AssessmentsBarChart({ counts }: { counts: { date: string; count: number }[] }) {
  const width = 720;
  const height = 180;
  const padding = 8;
  const max = Math.max(1, ...counts.map((c) => c.count));
  const barGap = 3;
  const barWidth = counts.length > 0 ? (width - padding * 2) / counts.length - barGap : 0;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="Assessments completed over the last 30 days">
        {counts.map((c, i) => {
          const barHeight = (c.count / max) * (height - padding * 2 - 20);
          const x = padding + i * (barWidth + barGap);
          const y = height - padding - 20 - barHeight;
          return (
            <g key={c.date}>
              <rect
                x={x}
                y={y}
                width={Math.max(barWidth, 1)}
                height={Math.max(barHeight, c.count > 0 ? 2 : 0)}
                rx={2}
                fill="#22d3ee"
                opacity={c.count > 0 ? 0.85 : 0.15}
              />
              {c.count === 0 && (
                <rect x={x} y={height - padding - 20 - 2} width={Math.max(barWidth, 1)} height={2} rx={1} fill="#334155" />
              )}
            </g>
          );
        })}
        <line x1={padding} y1={height - padding - 20} x2={width - padding} y2={height - padding - 20} stroke="rgba(148,163,184,0.25)" strokeWidth={1} />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-dim">
        <span>{counts[0]?.date}</span>
        <span>{counts[counts.length - 1]?.date}</span>
      </div>
    </div>
  );
}
