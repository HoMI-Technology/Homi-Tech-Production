import { Link } from "@/i18n/navigation";

interface PillarReading {
  key: string;
  name: string;
  value: number;
  max: number;
  color: string;
  pct: number;
}

interface TrinityGapAlertProps {
  pillars: PillarReading[];
}

export function TrinityGapAlert({ pillars }: TrinityGapAlertProps) {
  let maxGap = 0;
  let gapPair: [PillarReading, PillarReading] | null = null;

  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const gap = Math.abs(pillars[i].value - pillars[j].value);
      if (gap > maxGap) {
        maxGap = gap;
        gapPair = [pillars[i], pillars[j]];
      }
    }
  }

  if (maxGap <= 40 || !gapPair) return null;

  const [stronger, weaker] = gapPair[0].value >= gapPair[1].value ? gapPair : [gapPair[1], gapPair[0]];

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-amber/30 px-5 py-4"
      style={{ background: "rgba(250, 182, 51, 0.08)" }}
    >
      <div className="flex items-start gap-3">
        <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M10 2v8m0 4h.01" strokeLinecap="round" />
          <circle cx="10" cy="10" r="8" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-light">
            Trinity gap detected — {maxGap} points between pillars
          </p>
          <p className="mt-1 text-sm text-dim">
            Your {stronger.name.toLowerCase()} ({stronger.value}/{stronger.max}) is significantly
            ahead of {weaker.name.toLowerCase()} ({weaker.value}/{weaker.max}). This imbalance
            can distort your overall readiness signal.
          </p>
          <Link href="/trinity" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-amber hover:underline">
            Rebalance your trinity
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 8h11m0 0L9 4m4 4l-4 4" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
