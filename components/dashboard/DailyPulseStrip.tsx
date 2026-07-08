import type { DailyCheckin } from "@/types/database";

/**
 * Server-safe mini trend chart for mood vs. financial stress over the
 * last N check-ins (most-recent-first input; rendered oldest-to-newest).
 */
export function DailyPulseStrip({ checkins }: { checkins: DailyCheckin[] }) {
  if (checkins.length === 0) {
    return (
      <p className="text-sm text-dim">
        No check-ins yet. A 60-second daily check-in builds a picture of how you&rsquo;re really doing.
      </p>
    );
  }

  const ordered = [...checkins].reverse();
  const width = 640;
  const height = 100;
  const padding = 16;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const pointsFor = (key: "mood" | "financial_stress") =>
    ordered.map((c, i) => {
      const x = padding + (ordered.length === 1 ? chartWidth / 2 : (i / (ordered.length - 1)) * chartWidth);
      const value = c[key];
      const y = padding + chartHeight - (value / 10) * chartHeight;
      return `${x},${y}`;
    });

  const moodPoints = pointsFor("mood").join(" ");
  const stressPoints = pointsFor("financial_stress").join(" ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="Mood and financial stress trend over recent check-ins"
        preserveAspectRatio="xMidYMid meet"
      >
        <polyline points={moodPoints} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={stressPoints} fill="none" stroke="#f24822" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      </svg>
      <div className="mt-3 flex gap-6 text-xs text-dim">
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald" /> Mood
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-crimson" /> Financial stress
        </span>
        <span className="ml-auto">{checkins.length} check-in{checkins.length === 1 ? "" : "s"} logged</span>
      </div>
    </div>
  );
}
