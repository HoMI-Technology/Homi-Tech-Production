import { COLORS } from "@/lib/brand";

/**
 * Interlocking HōMI hexes — cyan + amber gold. Rail brand mark beside the wordmark.
 * Decorative. Not the rail brand stack — ThresholdCompass is the one compass.
 */
export function HomiHexes({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      data-homi-hexes=""
    >
      <polygon
        points="10,3 18,7.6 18,16.8 10,21.4 2,16.8 2,7.6"
        fill={COLORS.cyan}
      />
      <polygon
        points="22,9 30,13.6 30,22.8 22,27.4 14,22.8 14,13.6"
        fill={COLORS.amber}
      />
    </svg>
  );
}
