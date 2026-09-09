import { COLORS, withAlpha } from "@/lib/brand";

/**
 * Decorative readiness ring. Numeral lives once in the hero text.
 * Hard stop forces amber/crimson — never emerald On track / READY.
 */
export function HomeScoreGauge({
  scorePct,
  hardStopActive,
}: {
  scorePct: number;
  hardStopActive: boolean;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, scorePct / 100));
  const dash = c * pct;
  const stroke = hardStopActive ? COLORS.amber : COLORS.cyan;
  const track = withAlpha(COLORS.slateHigh, 0.7);

  return (
    <svg
      viewBox="0 0 108 108"
      width={132}
      height={132}
      aria-hidden
      data-home-score-gauge=""
      data-gauge-stop={hardStopActive ? "1" : "0"}
    >
      <circle cx="54" cy="54" r={r} fill="none" stroke={track} strokeWidth="8" />
      <circle
        cx="54"
        cy="54"
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 54 54)"
      />
    </svg>
  );
}
