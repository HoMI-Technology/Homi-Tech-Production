/**
 * Verdict hero numeral — the server-computed value, statically.
 * Digit tickers (0 → N, overshoot-and-settle) are forbidden: AI explains,
 * deterministic code scores, and the UI only renders the returned integer.
 * A one-shot opacity crossfade of the final figure is the only motion.
 */
export function HeroScore({ value, color }: { value: number; color: string }) {
  return (
    <span
      className="score-numeral relative inline-block font-bold tabular-nums text-light"
      style={{
        fontSize: "clamp(4rem, 8vw, 6rem)",
        letterSpacing: "-0.04em",
        lineHeight: "1.05",
        textShadow: `0 0 60px ${color}66`,
      }}
    >
      <span aria-hidden className="score-reveal">
        {value}
      </span>
      <span className="sr-only">{`Overall HōMI-Score ${value} out of 100`}</span>
    </span>
  );
}
