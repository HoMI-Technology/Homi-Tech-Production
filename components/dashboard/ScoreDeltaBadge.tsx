import { formatScoreDelta } from "@/lib/assessment/format";

/**
 * Small badge showing score movement vs. the previous assessment.
 * Server-safe (no hooks) — usable from both the server-rendered dashboard
 * and the client-rendered results page.
 */
export function ScoreDeltaBadge({
  current,
  previous,
  previousDate,
}: {
  current: number;
  previous: number;
  previousDate: string;
}) {
  const delta = formatScoreDelta(current, previous, previousDate);
  const toneClass =
    delta.tone === "up" ? "text-emerald" : delta.tone === "down" ? "text-crimson" : "text-dim";

  return (
    <span
      className={`score-numeral inline-flex items-center gap-1 rounded-full border border-slate-surface/60 bg-slate-surface/40 px-3 py-1 text-xs font-semibold ${toneClass}`}
    >
      {delta.text}
    </span>
  );
}
