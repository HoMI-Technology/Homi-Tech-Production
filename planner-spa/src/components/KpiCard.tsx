import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import AnimatedNumber from '@/components/AnimatedNumber'
import PulseDot from '@/components/PulseDot'
import type { Temperature } from '@/store/budget'
import { TEMP_HEX } from '@/store/budget'

export type KpiMeter = {
  /** 0..1 fill fraction */
  fraction: number
  /** tick positions as 0..1 fractions */
  ticks?: number[]
}

/** Shared KPI card — design.md §6.3. Spring value, delta chip, temperature dot, meter or sparkline. */
export default function KpiCard({
  label,
  value,
  format,
  delta,
  temperature,
  caption,
  meter,
  spark,
  onClick,
  index = 0,
}: {
  label: string
  value: number
  format?: (n: number) => string
  /** signed delta text + direction, e.g. "+2.1 pts vs Oct" */
  delta?: { text: string; positive: boolean }
  temperature?: Temperature
  caption?: string
  meter?: KpiMeter
  /** 6-point mini sparkline values (rendered instead of meter) */
  spark?: number[]
  onClick?: () => void
  index?: number
}) {
  const tempHex = temperature ? TEMP_HEX[temperature] : undefined
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="card-chrome group relative flex h-full w-full flex-col p-5 text-left transition-[border-color] duration-200 hover:border-white/[0.12]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-label">{label}</span>
        {temperature && <PulseDot temperature={temperature} size={6} />}
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <AnimatedNumber value={value} format={format} className="text-kpi text-light" />
      </div>
      {caption && <p className="mt-1 text-xs text-dim">{caption}</p>}
      {delta && (
        <span
          className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            delta.positive ? 'bg-emerald/10 text-emerald' : 'bg-crimson/10 text-crimson'
          }`}
        >
          {delta.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {delta.text}
        </span>
      )}
      {meter && (
        <div className="relative mt-auto pt-4">
          <div className="relative h-[4px] overflow-visible rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, meter.fraction * 100))}%` }}
              transition={{ duration: 0.7, delay: 0.15 + index * 0.06, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                backgroundColor: tempHex ?? '#22d3ee',
                boxShadow: `0 0 8px ${tempHex ?? '#22d3ee'}88`,
              }}
            />
            {meter.ticks?.map((t, i) => (
              <span
                key={i}
                className="absolute top-[-3px] h-[10px] w-px bg-white/[0.18]"
                style={{ left: `${t * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}
      {spark && spark.length > 1 && (
        <div className="mt-auto pt-3">
          <Sparkline values={spark} color={tempHex ?? '#34d399'} />
        </div>
      )}
    </motion.button>
  )
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 100
  const h = 26
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - ((v - min) / range) * (h - 6)}`)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[26px] w-full" preserveAspectRatio="none">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
