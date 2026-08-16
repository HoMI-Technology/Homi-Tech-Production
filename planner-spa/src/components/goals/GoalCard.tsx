import { motion } from 'framer-motion'
import { AlertTriangle, CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react'
import { fmt } from '@/store/budget'
import type { Goal } from '@/store/budget'
import AnimatedNumber from '@/components/AnimatedNumber'
import { goalIconFor } from '@/components/goals/goalIcons'
import { cn } from '@/lib/utils'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const RING_SIZE = 120
const RING_STROKE = 10
const R = (RING_SIZE - RING_STROKE) / 2
const CIRC = 2 * Math.PI * R
const MILESTONE_STEP = 5000

export function nextMilestone(goal: Goal): number | null {
  if (goal.saved >= goal.target) return null
  return Math.min(goal.target, (Math.floor(goal.saved / MILESTONE_STEP) + 1) * MILESTONE_STEP)
}

export function milestoneStep(): number {
  return MILESTONE_STEP
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

function paceLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

type Projection =
  | { kind: 'funded' }
  | { kind: 'noContribution' }
  | { kind: 'onPace'; monthsToGo: number; date: Date }
  | { kind: 'behind'; monthsBehind: number; neededMonthly: number }

export function projectGoal(goal: Goal): Projection {
  const remaining = goal.target - goal.saved
  if (remaining <= 0) return { kind: 'funded' }
  if (goal.monthlyContribution <= 0) return { kind: 'noContribution' }
  const now = new Date()
  const monthsToGo = Math.ceil(remaining / goal.monthlyContribution)
  const paceDate = new Date(now.getFullYear(), now.getMonth() + monthsToGo, 1)
  if (goal.deadline) {
    const dl = new Date(`${goal.deadline}T00:00:00`)
    if (!Number.isNaN(dl.getTime()) && paceDate.getTime() > dl.getTime()) {
      const monthsRemaining = Math.max(1, monthsBetween(now, dl))
      return {
        kind: 'behind',
        monthsBehind: Math.max(1, monthsBetween(dl, paceDate)),
        neededMonthly: Math.ceil(remaining / monthsRemaining),
      }
    }
    if (!Number.isNaN(dl.getTime())) return { kind: 'onPace', monthsToGo, date: dl }
  }
  return { kind: 'onPace', monthsToGo, date: paceDate }
}

/** One premium goal card — goals.md §4. */
export default function GoalCard({
  goal,
  index,
  celebrating,
  onEdit,
  onDelete,
  onContribute,
  onCelebrationEnd,
}: {
  goal: Goal
  index: number
  celebrating: boolean
  onEdit: () => void
  onDelete: () => void
  onContribute: () => void
  onCelebrationEnd: () => void
}) {
  const pct = goal.target > 0 ? Math.min(1, goal.saved / goal.target) : 0
  const projection = projectGoal(goal)
  const milestone = nextMilestone(goal)
  const Icon = goalIconFor(goal)
  const tipAngle = ((-90 + pct * 360) * Math.PI) / 180
  const tipX = RING_SIZE / 2 + R * Math.cos(tipAngle)
  const tipY = RING_SIZE / 2 + R * Math.sin(tipAngle)

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{ duration: 0.35, delay: 0.06 + index * 0.08, ease: EASE }}
      className="card-chrome group relative overflow-hidden p-6"
    >
      {/* accent hairline in goal color */}
      <span
        aria-hidden
        className="absolute inset-x-[8%] top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${goal.color}66, transparent)` }}
      />

      {/* header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${goal.color}14`, border: `1px solid ${goal.color}33` }}
          >
            <Icon size={18} style={{ color: goal.color }} />
          </span>
          <h2 className="text-h2">{goal.name}</h2>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <button
            onClick={onEdit}
            aria-label={`Edit ${goal.name}`}
            className="rounded-lg p-1.5 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            aria-label={`Delete ${goal.name}`}
            className="rounded-lg p-1.5 text-dim transition-colors hover:bg-crimson/10 hover:text-crimson"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* ring + numbers */}
      <div className="mt-5 flex items-center gap-5">
        <div className="relative h-[120px] w-[120px] shrink-0 max-sm:h-24 max-sm:w-24">
          {/* milestone glow sweep */}
          {celebrating && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `conic-gradient(from 0deg, transparent 0deg, ${goal.color} 70deg, transparent 140deg)`,
                maskImage: 'radial-gradient(circle, transparent 58%, black 60%)',
                WebkitMaskImage: 'radial-gradient(circle, transparent 58%, black 60%)',
              }}
              initial={{ rotate: 0, opacity: 0 }}
              animate={{ rotate: 360, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              onAnimationComplete={onCelebrationEnd}
            />
          )}
          <svg viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="h-full w-full">
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={R}
              fill="none"
              stroke="rgba(226,232,240,0.06)"
              strokeWidth={RING_STROKE}
            />
            <motion.circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={R}
              fill="none"
              stroke={goal.color}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              initial={{ strokeDashoffset: CIRC }}
              animate={{ strokeDashoffset: CIRC * (1 - pct) }}
              transition={{ duration: 0.9, delay: 0.15 + index * 0.15, ease: 'easeOut' }}
            />
            {pct > 0 && (
              <motion.circle
                key={`tip-${goal.saved}`}
                fill={goal.color}
                style={{ filter: `drop-shadow(0 0 6px ${goal.color})` }}
                initial={{ cx: tipX, cy: tipY, r: 7, opacity: 0.5 }}
                animate={{ cx: tipX, cy: tipY, r: 4, opacity: 1 }}
                transition={{
                  cx: { duration: 0.9, delay: 0.15 + index * 0.15, ease: 'easeOut' },
                  cy: { duration: 0.9, delay: 0.15 + index * 0.15, ease: 'easeOut' },
                  r: { duration: 0.6, ease: 'easeOut' },
                  opacity: { duration: 0.6, ease: 'easeOut' },
                }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatedNumber
              value={pct * 100}
              format={(n) => `${Math.round(n)}%`}
              className="text-kpi block !text-[26px] text-light max-sm:!text-[22px]"
            />
            <span className="text-label mt-0.5 !text-[9px]">Funded</span>
          </div>
        </div>

        <div className="min-w-0">
          <AnimatedNumber
            value={goal.saved}
            format={(n) => fmt(n)}
            className="block font-display text-xl font-semibold text-light tnum"
          />
          <p className="mt-0.5 text-sm text-dim">of {fmt(goal.target)}</p>
          <p className="text-data-sm mt-2.5 text-dim">
            {goal.monthlyContribution > 0 ? `${fmt(goal.monthlyContribution)}/mo contribution` : 'no auto contribution'}
          </p>
        </div>
      </div>

      {/* projection */}
      <div className="mt-5 border-t border-white/[0.06] pt-4">
        {projection.kind === 'funded' && (
          <p className="flex items-center gap-2 text-sm text-emerald">
            <CalendarClock size={14} className="shrink-0" />
            Fully funded — time to put it to work.
          </p>
        )}
        {projection.kind === 'noContribution' && (
          <p className="flex items-center gap-2 text-sm text-dim">
            <CalendarClock size={14} className="shrink-0" />
            Set a monthly contribution to project a finish date.
          </p>
        )}
        {projection.kind === 'onPace' && (
          <p className="flex items-center gap-2 text-sm text-dim">
            <CalendarClock size={14} className="shrink-0" />
            <span>
              <span className="font-semibold text-light">{projection.monthsToGo} months to go</span> · on pace for{' '}
              <span className="font-semibold" style={{ color: goal.color }}>
                {paceLabel(projection.date)}
              </span>
            </span>
          </p>
        )}
        {projection.kind === 'behind' && (
          <p className="flex items-center gap-2 text-sm text-amber">
            <AlertTriangle size={14} className="shrink-0" />
            <span>
              {projection.monthsBehind} months behind — needs{' '}
              <span className="font-semibold">{fmt(projection.neededMonthly)}/mo</span>
            </span>
          </p>
        )}
      </div>

      {/* footer */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onContribute}
          disabled={projection.kind === 'funded'}
          className={cn(
            'flex items-center gap-1.5 rounded-xl border border-cyan/30 px-3 py-1.5 text-xs font-semibold text-cyan transition-colors',
            projection.kind === 'funded' ? 'opacity-40' : 'hover:bg-cyan/10',
          )}
        >
          <Plus size={13} />
          Contribute
        </motion.button>
        <span className="text-data-sm text-dim">
          {milestone !== null ? `next milestone ${fmt(milestone)}` : 'goal complete'}
        </span>
      </div>
    </motion.article>
  )
}
