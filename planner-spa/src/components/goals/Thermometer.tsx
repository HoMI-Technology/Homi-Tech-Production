import { useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  TEMP_HEX,
  cashFlowTemperature,
  debtToIncome,
  dtiTemperature,
  fmtPct,
  monthExpenses,
  monthIncome,
  runwayMonths,
  runwayTemperature,
  savingsRate,
  savingsTemperature,
  useBudget,
} from '@/store/budget'
import type { Temperature } from '@/store/budget'
import PulseDot from '@/components/PulseDot'

const TEMP_ORDER: Temperature[] = ['emerald', 'yellow', 'amber', 'crimson']

type Zone = { from: number; to: number; temp: Temperature }

type GaugeDef = {
  key: string
  name: string
  value: number
  min: number
  max: number
  format: (v: number) => string
  zones: Zone[]
  temperature: Temperature
  verdict: string
}

function useTrackWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

function centsWord(v: number): string {
  return `${Math.max(0, Math.round(v * 100))}¢`
}

function savingsVerdict(rate: number): string {
  if (rate >= 0.2) return `Healthy — you save ${centsWord(rate)} of every dollar.`
  if (rate >= 0.1) return `Caution — you save ${centsWord(rate)} of every dollar; 20¢ is the mark.`
  if (rate >= 0) return `Watch — you keep ${centsWord(rate)} of every dollar. Thin margin.`
  return 'At risk — you spend more than you earn.'
}

function cashFlowVerdict(ratio: number): string {
  if (ratio >= 0.15) return `Healthy — ${centsWord(ratio)} of every dollar stays after spending.`
  if (ratio >= 0.05) return `Caution — ${centsWord(ratio)} breathing room before debt payments.`
  if (ratio >= 0) return `Watch — nearly everything you earn is spoken for.`
  return 'At risk — spending outruns income.'
}

function runwayVerdict(months: number): string {
  const m = months.toFixed(1)
  if (months >= 6) return `Healthy — ${m} months of cushion if income stopped.`
  if (months >= 3) return `Caution — ${m} months of runway; 6 is the goal.`
  if (months >= 1) return `Watch — only ${m} months of runway. One shock hurts.`
  return 'At risk — under a month of runway.'
}

function dtiVerdict(dti: number): string {
  const pct = fmtPct(dti)
  if (dti <= 0.28) return `Healthy — debt takes only ${pct} of income.`
  if (dti <= 0.36) return `Caution — ${pct} of income goes to debt.`
  if (dti <= 0.43) return `Watch — ${pct} of income is already owed.`
  return `At risk — ${pct} of income goes to debt; lenders will hesitate.`
}

function worstTemperature(temps: Temperature[]): Temperature {
  return temps.reduce((worst, t) => (TEMP_ORDER.indexOf(t) > TEMP_ORDER.indexOf(worst) ? t : worst), 'emerald')
}

const VERDICT_LABEL: Record<Temperature, string> = {
  emerald: 'READY',
  yellow: 'ALMOST THERE',
  amber: 'BUILD FIRST',
  crimson: 'NOT YET',
}

function Gauge({ def, index }: { def: GaugeDef; index: number }) {
  const [trackRef, width] = useTrackWidth()
  const clamped = Math.max(def.min, Math.min(def.max, def.value))
  const fraction = (clamped - def.min) / (def.max - def.min)
  const hex = TEMP_HEX[def.temperature]

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-light">{def.name}</p>
        <p className="text-data-sm" style={{ color: hex }}>
          {def.format(def.value)}
        </p>
      </div>

      {/* track with temperature zones + marker */}
      <div ref={trackRef} className="relative mt-2">
        <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
          {def.zones.map((z) => {
            const left = ((z.from - def.min) / (def.max - def.min)) * 100
            const w = ((z.to - z.from) / (def.max - def.min)) * 100
            return (
              <motion.span
                key={`${z.temp}-${z.from}`}
                className="absolute inset-y-0"
                style={{ left: `${left}%`, width: `${w}%`, backgroundColor: TEMP_HEX[z.temp] }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.22 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.12 }}
              />
            )
          })}
        </div>

        {/* needle + glowing marker + comet trail (transform-based) */}
        <motion.div
          className="pointer-events-none absolute top-1/2"
          initial={{ x: 0 }}
          animate={{ x: Math.max(6, Math.min(width - 6, fraction * width)) }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.12 }}
        >
          {/* comet trail */}
          <motion.span
            className="absolute right-0 top-1/2 h-[3px] w-12 -translate-y-1/2 rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${hex}66)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.25] }}
            transition={{ duration: 1.4, delay: index * 0.12, times: [0, 0.5, 1] }}
          />
          {/* needle */}
          <span
            className="absolute top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2"
            style={{ backgroundColor: `${hex}88` }}
          />
          {/* dot */}
          <motion.span
            className="absolute top-1/2 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-navy"
            initial={false}
            animate={{ backgroundColor: hex, boxShadow: `0 0 10px ${hex}aa, 0 0 0 3px ${hex}26` }}
            transition={{ duration: 0.4 }}
          />
        </motion.div>
      </div>

      <p className="mt-1.5 text-xs text-dim">{def.verdict}</p>
    </div>
  )
}

/** HōMI readiness thermometer — goals.md §6. Worst of four temperatures governs. */
export default function Thermometer() {
  const { state, monthOffset } = useBudget()

  const rate = savingsRate(state, monthOffset)
  const income = monthIncome(state, monthOffset)
  const cashRatio = income > 0 ? (income - monthExpenses(state, monthOffset)) / income : 0
  const runway = runwayMonths(state)
  const dti = debtToIncome(state, monthOffset)

  const gauges: GaugeDef[] = [
    {
      key: 'savings',
      name: 'Savings Rate',
      value: rate,
      min: -0.1,
      max: 0.5,
      format: (v) => fmtPct(v),
      zones: [
        { from: -0.1, to: 0, temp: 'crimson' },
        { from: 0, to: 0.1, temp: 'amber' },
        { from: 0.1, to: 0.2, temp: 'yellow' },
        { from: 0.2, to: 0.5, temp: 'emerald' },
      ],
      temperature: savingsTemperature(rate),
      verdict: savingsVerdict(rate),
    },
    {
      key: 'cashflow',
      name: 'Cash-flow ratio',
      value: cashRatio,
      min: -0.1,
      max: 0.4,
      format: (v) => fmtPct(v),
      zones: [
        { from: -0.1, to: 0, temp: 'crimson' },
        { from: 0, to: 0.05, temp: 'amber' },
        { from: 0.05, to: 0.15, temp: 'yellow' },
        { from: 0.15, to: 0.4, temp: 'emerald' },
      ],
      temperature: cashFlowTemperature(cashRatio),
      verdict: cashFlowVerdict(cashRatio),
    },
    {
      key: 'runway',
      name: 'Emergency Runway',
      value: runway,
      min: 0,
      max: 9,
      format: (v) => `${v.toFixed(1)} mo`,
      zones: [
        { from: 0, to: 1, temp: 'crimson' },
        { from: 1, to: 3, temp: 'amber' },
        { from: 3, to: 6, temp: 'yellow' },
        { from: 6, to: 9, temp: 'emerald' },
      ],
      temperature: runwayTemperature(runway),
      verdict: runwayVerdict(runway),
    },
    {
      key: 'dti',
      name: 'Debt-to-Income',
      value: dti,
      min: 0,
      max: 0.5,
      format: (v) => fmtPct(v),
      zones: [
        { from: 0, to: 0.28, temp: 'emerald' },
        { from: 0.28, to: 0.36, temp: 'yellow' },
        { from: 0.36, to: 0.43, temp: 'amber' },
        { from: 0.43, to: 0.5, temp: 'crimson' },
      ],
      temperature: dtiTemperature(dti),
      verdict: dtiVerdict(dti),
    },
  ]

  const overall = worstTemperature(gauges.map((g) => g.temperature))

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="card-chrome col-span-12 flex flex-col p-5 xl:col-span-5"
    >
      <h2 className="text-h2">Readiness thermometer</h2>
      <p className="mt-0.5 text-xs text-dim">HōMI temperature scale · live</p>

      <div className="mt-5 flex flex-1 flex-col justify-between gap-5">
        {gauges.map((def, i) => (
          <Gauge key={def.key} def={def} index={i} />
        ))}
      </div>

      {/* overall verdict */}
      <div className="mt-6 border-t border-white/[0.06] pt-4">
        <div className="flex items-center gap-3">
          <PulseDot temperature={overall} size={14} />
          <span className="font-display text-lg font-bold tracking-wide" style={{ color: TEMP_HEX[overall] }}>
            {VERDICT_LABEL[overall]}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-dim">overall readiness</span>
        </div>
        <p className="mt-2 font-serif italic text-light/85">
          {overall === 'crimson' || overall === 'amber'
            ? 'Not yet is not no. It is clarity.'
            : 'Know when you\u2019re ready.'}
        </p>
      </div>
    </motion.section>
  )
}
