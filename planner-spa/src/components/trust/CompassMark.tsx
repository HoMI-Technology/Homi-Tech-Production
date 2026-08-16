/**
 * Static Threshold Compass mark — canonical geometry (200×200 viewBox)
 * replicated from src/components/readiness/ThresholdCompass.tsx at small
 * size, with no animation, so it prints cleanly. Used as the brand mark
 * on the printable readiness report header.
 *
 * (ThresholdCompass itself takes only { result } and renders the full
 * animated hero card — there is no size prop on master, so the report
 * uses this static mark instead of duplicating the hero.)
 */
export default function CompassMark({ size = 56 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label="HōMI Threshold Compass mark"
    >
      {/* outer ring — Financial Reality (cyan) + four 45° dots */}
      <circle cx={100} cy={100} r={85} fill="none" stroke="#22d3ee" strokeWidth={2} opacity={0.6} />
      <circle cx={160.1} cy={39.9} r={3} fill="#22d3ee" />
      <circle cx={160.1} cy={160.1} r={3} fill="#22d3ee" />
      <circle cx={39.9} cy={160.1} r={3} fill="#22d3ee" />
      <circle cx={39.9} cy={39.9} r={3} fill="#22d3ee" />
      {/* middle ring — Emotional Truth (emerald) + cardinal dots */}
      <circle cx={100} cy={100} r={60} fill="none" stroke="#34d399" strokeWidth={2} opacity={0.7} />
      <circle cx={100} cy={40} r={2.5} fill="#34d399" />
      <circle cx={160} cy={100} r={2.5} fill="#34d399" />
      <circle cx={100} cy={160} r={2.5} fill="#34d399" />
      <circle cx={40} cy={100} r={2.5} fill="#34d399" />
      {/* inner ring — Perfect Timing (yellow) */}
      <circle cx={100} cy={100} r={35} fill="none" stroke="#facc15" strokeWidth={2} opacity={0.8} />
      {/* canonical keyhole center (default yellow state) */}
      <circle cx={100} cy={96} r={12} stroke="#facc15" strokeWidth={2} fill="none" />
      <rect x={94} y={104} width={12} height={16} rx={2} stroke="#facc15" strokeWidth={2} fill="none" />
      <circle cx={100} cy={96} r={5} fill="#facc15" />
      <rect x={97} y={96} width={6} height={12} fill="#facc15" />
    </svg>
  )
}
