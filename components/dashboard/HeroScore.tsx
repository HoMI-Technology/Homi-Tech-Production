/**
 * Verdict hero numeral — the server-computed value, statically.
 * Digit tickers (0 → N, overshoot-and-settle) are forbidden: AI explains,
 * deterministic code scores, and the UI only renders the returned integer.
 * A one-shot opacity crossfade of the final figure is the only motion
 * (`.score-reveal` in globals.css; killed under prefers-reduced-motion).
 *
 * A11y-safe: the decorative figure is aria-hidden; screen readers get only
 * the final value. No "use client" — no hooks remain, so the server HTML
 * carries the real number (no hydration swap, no CLS ghost).
 */
export function HeroScore({ value, color }: { value: number; color: string }) {
  return (
    <span
      className="score-numeral relative inline-block font-bold tabular-nums text-light"
      style={{
        fontSize: "clamp(4rem, 8vw, 6rem)",
        letterSpacing: "-0.04em",
        lineHeight: "1.05",
        // Stronger glow than the original — score is the dominant instrument
        textShadow: `0 0 60px ${color}66`,
      }}
    >
      <span aria-hidden className="score-reveal">
        {value}
      </span>
      <span className="sr-only">{`Overall Decision Readiness Score ${value} out of 100`}</span>
    </span>
  );
}
