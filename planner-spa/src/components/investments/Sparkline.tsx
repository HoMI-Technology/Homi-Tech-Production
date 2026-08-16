import { memo, useId } from 'react'

/** Tiny SVG sparkline — emerald if up over the period, crimson if down. */
function Sparkline({
  values,
  width = 64,
  height = 24,
  color,
  strokeWidth = 1.5,
  className,
}: {
  values: number[]
  width?: number
  height?: number
  /** Overrides the automatic up/down coloring. */
  color?: string
  strokeWidth?: number
  className?: string
}) {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, '')
  if (values.length < 2) return <div style={{ width, height }} className={className} />

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const up = values[values.length - 1] >= values[0]
  const c = color ?? (up ? '#34d399' : '#f24822')
  const x = (i: number) => (i / (values.length - 1)) * width
  const y = (v: number) => height - 2 - ((v - min) / range) * (height - 4)
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width, height }}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.22" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts.join(' ')} ${width},${height}`} fill={`url(#spark-${gid})`} />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={c}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default memo(Sparkline)
