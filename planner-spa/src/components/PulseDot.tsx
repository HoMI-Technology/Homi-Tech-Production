import { memo } from 'react'
import { cn } from '@/lib/utils'
import type { Temperature } from '@/store/budget'
import { TEMP_HEX } from '@/store/budget'

/** Breathing status dot (2s opacity loop) with a matching glow ring. */
function PulseDot({
  color,
  temperature,
  size = 6,
  className,
}: {
  color?: string
  temperature?: Temperature
  size?: number
  className?: string
}) {
  const hex = color ?? (temperature ? TEMP_HEX[temperature] : '#34d399')
  return (
    <span
      className={cn('inline-block shrink-0 rounded-full animate-pulse-dot', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: hex,
        boxShadow: `0 0 0 3px ${hex}26, 0 0 10px ${hex}66`,
      }}
    />
  )
}

export default memo(PulseDot)
