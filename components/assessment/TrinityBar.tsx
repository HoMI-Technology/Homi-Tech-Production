import { PILLARS } from "@/lib/brand";

/**
 * Normalizes the three pillar (score/max) ratios so they sum to 100 —
 * a "relative strength" split, not an absolute fill. Falls back to equal
 * thirds when all three ratios are 0 so the bar never divides by zero.
 */
export function trinityShares(
  financial: number,
  emotional: number,
  timing: number,
  maxes: { financial: number; emotional: number; timing: number },
): { financial: number; emotional: number; timing: number } {
  const fRatio = maxes.financial > 0 ? Math.max(0, financial) / maxes.financial : 0;
  const eRatio = maxes.emotional > 0 ? Math.max(0, emotional) / maxes.emotional : 0;
  const tRatio = maxes.timing > 0 ? Math.max(0, timing) / maxes.timing : 0;

  const sum = fRatio + eRatio + tRatio;

  if (sum <= 0) {
    return { financial: 33.3, emotional: 33.3, timing: 33.4 };
  }

  return {
    financial: (fRatio / sum) * 100,
    emotional: (eRatio / sum) * 100,
    timing: (tRatio / sum) * 100,
  };
}

const FINANCIAL = PILLARS.find((p) => p.key === "financial")!;
const EMOTIONAL = PILLARS.find((p) => p.key === "emotional")!;
const TIMING = PILLARS.find((p) => p.key === "timing")!;

/**
 * A single proportion bar showing each pillar's RELATIVE strength — how it
 * stacks up against the other two, not just against its own max. Three
 * flex segments whose widths are trinityShares(...), color-matched to
 * PILLARS. Labels below show the raw score/max per pillar.
 */
export function TrinityBar({
  financial,
  emotional,
  timing,
}: {
  financial: number;
  emotional: number;
  timing: number;
}) {
  const shares = trinityShares(financial, emotional, timing, {
    financial: FINANCIAL.max,
    emotional: EMOTIONAL.max,
    timing: TIMING.max,
  });

  const segments = [
    {
      key: "financial",
      name: FINANCIAL.name,
      color: FINANCIAL.color,
      share: shares.financial,
      score: financial,
      max: FINANCIAL.max,
    },
    {
      key: "emotional",
      name: EMOTIONAL.name,
      color: EMOTIONAL.color,
      share: shares.emotional,
      score: emotional,
      max: EMOTIONAL.max,
    },
    {
      key: "timing",
      name: TIMING.name,
      color: TIMING.color,
      share: shares.timing,
      score: timing,
      max: TIMING.max,
    },
  ];

  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-surface/60"
        role="img"
        aria-label={`Relative pillar strength: ${segments.map((s) => `${s.name} ${Math.round(s.share)}%`).join(", ")}`}
      >
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="h-full"
            style={{ width: `${seg.share}%`, backgroundColor: seg.color }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {segments.map((seg) => (
          <div key={seg.key}>
            <p className="text-xs font-medium" style={{ color: seg.color }}>
              {seg.name}
            </p>
            <p className="score-numeral mt-0.5 text-sm text-light">
              {seg.score}/{seg.max}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
