import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { fmt } from '@/store/budget'

/**
 * Spring-animated counter (stiffness 120, damping 24). Re-tweens whenever
 * `value` changes; counts up from 0 on first mount.
 */
export default function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number
  format?: (n: number) => string
  className?: string
}) {
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 120, damping: 24 })
  const text = useTransform(spring, (v) => (format ? format(v) : fmt(v)))

  useEffect(() => {
    mv.set(value)
  }, [value, mv])

  return <motion.span className={className}>{text}</motion.span>
}
