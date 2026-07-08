/**
 * HōMI wordmark — locked anatomy, weight 900 only, letter colors per canon.
 * H #22d3ee · ō #34d399 · M #facc15 · I #22d3ee. Static — never animated.
 */
export function Wordmark({ className = "", size = "text-2xl" }: { className?: string; size?: string }) {
  return (
    <span
      className={`font-black tracking-tight select-none ${size} ${className}`}
      style={{ fontWeight: 900, letterSpacing: "-0.02em" }}
      aria-label="HōMI"
    >
      <span style={{ color: "#22d3ee" }}>H</span>
      <span style={{ color: "#34d399" }}>ō</span>
      <span style={{ color: "#facc15" }}>M</span>
      <span style={{ color: "#22d3ee" }}>I</span>
    </span>
  );
}
