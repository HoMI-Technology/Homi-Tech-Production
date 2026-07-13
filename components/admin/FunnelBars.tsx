/**
 * Server-safe horizontal funnel — one row per stage with count, share bar,
 * and stage-to-stage conversion. Pure markup, no client JS.
 */
export interface FunnelStage {
  label: string;
  count: number;
  color: string;
}

export function FunnelBars({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="space-y-5">
      {stages.map((stage, i) => {
        const prev = i > 0 ? stages[i - 1].count : null;
        // Stages aren't strictly nested (accounts can exist without a waitlist
        // entry), so only show conversion when it reads as a true rate.
        const rawConversion = prev !== null && prev > 0 ? Math.round((stage.count / prev) * 100) : null;
        const conversion = rawConversion !== null && rawConversion <= 100 ? rawConversion : null;
        const widthPct = Math.max(2, Math.round((stage.count / max) * 100));
        return (
          <div key={stage.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-semibold text-light">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: stage.color, boxShadow: `0 0 8px ${stage.color}` }}
                />
                {stage.label}
              </span>
              <span className="score-numeral text-dim">
                {stage.count.toLocaleString()}
                {conversion !== null && (
                  <span className="ml-2 text-xs">({conversion}% of previous)</span>
                )}
              </span>
            </div>
            <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-slate-surface">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, ${stage.color}88, ${stage.color})`,
                  boxShadow: `0 0 16px -4px ${stage.color}`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
