import { COLORS } from "@/lib/brand";

/**
 * HōMI wordmark — locked anatomy, weight 900 only, letter colors per canon.
 * H cyan · ō emerald · M yellow · I cyan (lib/brand COLORS). Static — never animated.
 */
export function Wordmark({
  className = "",
  size = "text-2xl",
}: {
  className?: string;
  size?: string;
}) {
  return (
    <span
      className={`homi-wordmark tracking-tight select-none ${size} ${className}`}
      data-wordmark=""
      style={{ fontWeight: 900, letterSpacing: "-0.02em" }}
      aria-label="HōMI"
    >
      <span data-letter="H" style={{ color: COLORS.cyan }}>
        H
      </span>
      <span data-letter="o" style={{ color: COLORS.emerald }}>
        ō
      </span>
      <span data-letter="M" style={{ color: COLORS.yellow }}>
        M
      </span>
      <span data-letter="I" style={{ color: COLORS.cyan }}>
        I
      </span>
    </span>
  );
}
