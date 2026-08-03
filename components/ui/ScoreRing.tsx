import { COLORS, withAlpha } from "@/lib/brand";

/**
 * Circular score display — JetBrains Mono numerals (canon), pillar-colored arc.
 */
export function ScoreRing({
  value,
  max = 100,
  size = 180,
  color = COLORS.cyan,
  label,
  sublabel,
}: {
  value: number;
  max?: number;
  size?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = c * pct;

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 128 128" width={size} height={size}>
          <circle cx="64" cy="64" r={r} fill="none" stroke={withAlpha(COLORS.slateHigh, 0.6)} strokeWidth="8" />
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            transform="rotate(-90 64 64)"
            style={{ filter: `drop-shadow(0 0 10px ${color}66)`, transition: "stroke-dasharray 900ms cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="score-numeral font-bold text-light" style={{ fontSize: size * 0.24 }}>
            {value}
          </span>
          {sublabel && (
            <span className="text-dim" style={{ fontSize: size * 0.07 }}>
              {sublabel}
            </span>
          )}
        </div>
      </div>
      {label && <span className="text-sm text-dim">{label}</span>}
    </div>
  );
}
