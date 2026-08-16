import { motion } from 'framer-motion'

/**
 * Progress ring — SVG arc with a JetBrains Mono fraction label.
 * Used for per-act and overall assessment progress.
 */
export default function ProgressRing({
  done,
  total,
  size = 44,
  stroke = 3.5,
  color = '#22d3ee',
  label,
}: {
  done: number
  total: number
  size?: number
  stroke?: number
  color?: string
  label?: string
}) {
  const frac = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <span className="inline-flex items-center gap-2" role="status" aria-label={label ?? `${done} of ${total}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - frac) }}
          transition={{ type: 'spring', stiffness: 120, damping: 24 }}
          style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
        />
      </svg>
      <span className="font-display text-[11px] font-medium tabular-nums text-dim">
        {done}
        <span className="text-dim/50">/{total}</span>
      </span>
    </span>
  )
}
