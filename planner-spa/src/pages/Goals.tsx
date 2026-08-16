import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Lightbulb, Plus, Target, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { fmt, monthlySeries, spendingByCategory, useBudget, useToast } from '@/store/budget'
import type { Goal } from '@/store/budget'
import AnimatedNumber from '@/components/AnimatedNumber'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useTopBarExtras } from '@/components/TopBar'
import GoalCard from '@/components/goals/GoalCard'
import { ContributeModal, GoalModal } from '@/components/goals/GoalModals'
import Thermometer from '@/components/goals/Thermometer'
import TrendCharts from '@/components/goals/TrendCharts'
import { cn } from '@/lib/utils'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const MILESTONE_STEP = 5000

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Zone = 'goals' | 'analytics'

export default function Goals() {
  const { state, addTransaction, contributeToGoal, deleteGoal } = useBudget()
  const { pushToast } = useToast()
  const location = useLocation()

  const [zone, setZone] = useState<Zone>('goals')
  const goalsRef = useRef<HTMLElement>(null)
  const analyticsRef = useRef<HTMLElement>(null)

  const [goalModal, setGoalModal] = useState<{ open: boolean; editingId: string | null }>({ open: false, editingId: null })
  const [contributeId, setContributeId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [celebratingId, setCelebratingId] = useState<string | null>(null)

  /* -------- top bar: + New goal -------- */
  const extras = useMemo(
    () => (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setGoalModal({ open: true, editingId: null })}
        className="mr-2 flex items-center gap-1.5 rounded-xl bg-cyan px-3.5 py-2 text-sm font-semibold text-navy shadow-glow-cyan"
      >
        <Plus size={15} />
        <span className="hidden sm:inline">New goal</span>
        <span className="sm:hidden">Goal</span>
      </motion.button>
    ),
    [],
  )
  useTopBarExtras(extras)

  /* -------- zone scroll-spy: active zone = whichever section crosses the 40% viewport line -------- */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          setZone(entry.target === analyticsRef.current ? 'analytics' : 'goals')
        }
      },
      { rootMargin: '0px 0px -60% 0px', threshold: 0 },
    )
    if (goalsRef.current) observer.observe(goalsRef.current)
    if (analyticsRef.current) observer.observe(analyticsRef.current)
    return () => observer.disconnect()
  }, [])

  /* -------- hash deep-link (/goals#analytics from the sidebar) -------- */
  useEffect(() => {
    if (location.hash !== '#analytics') return undefined
    setZone('analytics')
    const t = setTimeout(() => analyticsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    return () => clearTimeout(t)
  }, [location.hash])

  const selectZone = (z: Zone) => {
    setZone(z)
    const el = z === 'analytics' ? analyticsRef.current : goalsRef.current
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /* -------- contribute: linked expense + saved bump + milestone -------- */
  const handleContribute = (goal: Goal, amount: number) => {
    const before = goal.saved
    const after = Math.min(goal.target, before + amount)
    addTransaction({
      type: 'expense',
      amount,
      description: `Contribution — ${goal.name}`,
      categoryId: 'savings',
      date: todayIso(),
      notes: 'Goal contribution',
    })
    contributeToGoal(goal.id, amount)

    const crossed: number[] = []
    for (let m = Math.floor(before / MILESTONE_STEP) * MILESTONE_STEP + MILESTONE_STEP; m <= after; m += MILESTONE_STEP) {
      crossed.push(m)
    }
    if (after === goal.target && before < goal.target && !crossed.includes(goal.target)) crossed.push(goal.target)
    if (crossed.length > 0) {
      setCelebratingId(goal.id)
      pushToast({
        kind: 'success',
        message: `Milestone reached: ${fmt(crossed[crossed.length - 1])}`,
        description: goal.name,
      })
    }
  }

  const editingGoal = goalModal.editingId ? (state.goals.find((g) => g.id === goalModal.editingId) ?? null) : null
  const contributeGoal = contributeId ? (state.goals.find((g) => g.id === contributeId) ?? null) : null
  const deleteGoalObj = deleteId ? (state.goals.find((g) => g.id === deleteId) ?? null) : null

  return (
    <div>
      {/* -------- zone switcher -------- */}
      <div className="mb-6 inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
        {(
          [
            { key: 'goals', label: 'Goals' },
            { key: 'analytics', label: 'Analytics' },
          ] as { key: Zone; label: string }[]
        ).map((z) => (
          <button
            key={z.key}
            onClick={() => selectZone(z.key)}
            className="relative w-40 rounded-full px-4 py-2 text-sm font-semibold max-sm:w-32"
          >
            {zone === z.key && (
              <motion.span
                layoutId="zone-thumb"
                className="absolute inset-0 rounded-full border border-cyan/25 bg-cyan-400/15 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              />
            )}
            <span className={cn('relative transition-colors', zone === z.key ? 'text-cyan-200' : 'text-dim hover:text-light')}>
              {z.label}
            </span>
          </button>
        ))}
      </div>

      {/* ================= GOALS ZONE ================= */}
      <section ref={goalsRef} id="goals" className="scroll-mt-24">
        {state.goals.length === 0 ? (
          <GoalsEmpty onCreate={() => setGoalModal({ open: true, editingId: null })} />
        ) : (
          <div className="grid grid-cols-12 gap-4">
            <GoalsHero goals={state.goals} />
            <AnimatePresence mode="popLayout">
              {state.goals.map((g, i) => (
                <motion.div
                  key={g.id}
                  layout="position"
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                  className="col-span-12 lg:col-span-4"
                >
                  <GoalCard
                    goal={g}
                    index={i}
                    celebrating={celebratingId === g.id}
                    onCelebrationEnd={() => setCelebratingId((id) => (id === g.id ? null : id))}
                    onEdit={() => setGoalModal({ open: true, editingId: g.id })}
                    onDelete={() => setDeleteId(g.id)}
                    onContribute={() => setContributeId(g.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* ================= ANALYTICS ZONE ================= */}
      <section ref={analyticsRef} id="analytics" className="mt-6 scroll-mt-24">
        <div className="grid grid-cols-12 gap-4">
          <Thermometer />
          <TrendCharts />
          <InsightCards />
        </div>
      </section>

      {/* -------- modals -------- */}
      <GoalModal open={goalModal.open} editing={editingGoal} onClose={() => setGoalModal((m) => ({ ...m, open: false }))} />
      <ContributeModal goal={contributeGoal} onClose={() => setContributeId(null)} onContribute={handleContribute} />
      <ConfirmDialog
        open={deleteId !== null}
        title={`Delete ${deleteGoalObj?.name ?? 'goal'}?`}
        body="The goal and its progress will be removed. Your transactions are untouched — and you can undo right after."
        confirmLabel="Delete"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteGoal(deleteId)
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Goals hero summary (goals.md §3)                                    */
/* ------------------------------------------------------------------ */

function GoalsHero({ goals }: { goals: Goal[] }) {
  const totalSaved = goals.reduce((s, g) => s + g.saved, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target, 0)
  const monthly = goals.reduce((s, g) => s + g.monthlyContribution, 0)
  const fundedPct = totalTarget > 0 ? totalSaved / totalTarget : 0

  const stats = [
    { label: 'Total saved', value: totalSaved, caption: `across ${goals.length} goal${goals.length === 1 ? '' : 's'}`, accent: true },
    { label: 'Total target', value: totalTarget, caption: `${Math.round(fundedPct * 100)}% funded overall`, accent: false },
    { label: 'Monthly contributions', value: monthly, caption: 'auto-allocated from cash flow', accent: false },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="card-chrome card-hairline-top col-span-12 flex flex-col gap-6 p-6 lg:flex-row lg:items-center"
    >
      {/* stats */}
      <div className="flex flex-1 flex-wrap gap-x-10 gap-y-5 max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 + i * 0.06, ease: EASE }}
          >
            <p className="text-label">{s.label}</p>
            <AnimatedNumber
              value={s.value}
              format={(n) => fmt(n)}
              className={cn('text-kpi mt-1.5 block', s.accent ? 'text-emerald' : 'text-light')}
            />
            <p className="mt-1 text-xs text-dim">{s.caption}</p>
          </motion.div>
        ))}
      </div>

      {/* stacked contribution bar */}
      <div className="lg:w-[40%]">
        <div className="flex items-baseline justify-between">
          <p className="text-label">Contribution split</p>
          <p className="text-data-sm text-light">{fmt(monthly)}/mo</p>
        </div>
        <div className="mt-2.5 flex h-3 overflow-hidden rounded-full bg-white/[0.06]">
          {monthly > 0 &&
            goals
              .filter((g) => g.monthlyContribution > 0)
              .map((g, i) => {
                const pct = (g.monthlyContribution / monthly) * 100
                return (
                  <motion.div
                    key={g.id}
                    className="group relative h-full"
                    style={{ backgroundColor: g.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
                  >
                    <span className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/[0.1] bg-navyLight/95 px-2 py-1 text-[11px] text-light opacity-0 shadow-xl backdrop-blur transition-opacity duration-150 group-hover:opacity-100">
                      {g.name} · {fmt(g.monthlyContribution)}/mo
                    </span>
                  </motion.div>
                )
              })}
        </div>
        {monthly > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            {goals
              .filter((g) => g.monthlyContribution > 0)
              .map((g) => (
                <span key={g.id} className="flex items-center gap-1.5 text-[11px] text-dim">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name}
                </span>
              ))}
          </div>
        ) : (
          <p className="mt-2.5 text-[11px] text-dim">Set monthly contributions to see the split.</p>
        )}
      </div>
    </motion.section>
  )
}

/* ------------------------------------------------------------------ */
/* Goals empty state (goals.md §9)                                     */
/* ------------------------------------------------------------------ */

function GoalsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="card-chrome flex flex-col items-center justify-center py-16 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan/30 bg-cyan/10 shadow-[0_0_24px_rgba(34,211,238,0.2)]">
        <Target size={24} className="text-cyan" />
      </span>
      <p className="mt-5 font-serif text-xl italic text-light/90">A goal turns saving into arriving.</p>
      <p className="mt-1.5 max-w-sm text-sm text-dim">
        Name a target, set a monthly contribution, and HōMI will project the day you get there.
      </p>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onCreate}
        className="mt-5 rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-glow-cyan"
      >
        Create your first goal
      </motion.button>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Insight cards (goals.md §8) — computed from actual data             */
/* ------------------------------------------------------------------ */

type Insight = {
  severity: 'amber' | 'cyan' | 'emerald'
  icon: LucideIcon
  text: string
}

const INSIGHT_COLOR: Record<Insight['severity'], string> = {
  amber: '#fab633',
  cyan: '#22d3ee',
  emerald: '#34d399',
}

const SEVERITY_RANK: Record<Insight['severity'], number> = { amber: 0, cyan: 1, emerald: 2 }

function categoryTotal(state: Parameters<typeof spendingByCategory>[0], categoryId: string, offset: number): number {
  return spendingByCategory(state, offset).find((c) => c.category.id === categoryId)?.total ?? 0
}

function useInsights(): Insight[] {
  const { state } = useBudget()
  return useMemo(() => {
    const out: Insight[] = []
    const series = monthlySeries(state, 6)

    /* amber — fastest-rising category vs 3-month average */
    let spike: Insight | null = null
    let spikePct = -1
    for (const spend of spendingByCategory(state, 0)) {
      const id = spend.category.id
      const avg3 =
        (categoryTotal(state, id, -1) + categoryTotal(state, id, -2) + categoryTotal(state, id, -3)) / 3
      if (avg3 >= 50 && spend.total > avg3 * 1.15) {
        const upPct = Math.round(((spend.total - avg3) / avg3) * 100)
        if (upPct > spikePct) {
          spikePct = upPct
          spike = {
            severity: 'amber',
            icon: AlertTriangle,
            text: `${spend.category.name} is up ${upPct}% vs your 3-month average (${fmt(avg3)} → ${fmt(spend.total)}).`,
          }
        }
      }
    }
    if (spike) out.push(spike)

    /* cyan — goal acceleration math */
    const goal = state.goals.find((g) => g.target - g.saved > 0 && g.monthlyContribution > 0)
    if (goal) {
      const remaining = goal.target - goal.saved
      const months = remaining / goal.monthlyContribution
      const monthsBoosted = remaining / (goal.monthlyContribution + 200)
      const gained = Math.floor(months - monthsBoosted)
      if (gained >= 1) {
        const discretionary = spendingByCategory(state, 0).filter((s) =>
          ['dining', 'shopping', 'entertainment', 'travel'].includes(s.category.id),
        )[0]
        const source = discretionary?.category.name ?? 'spending'
        out.push({
          severity: 'cyan',
          icon: Lightbulb,
          text: `Moving $200/mo from ${source} to your ${goal.name} goal pulls your date in by ${gained} month${gained === 1 ? '' : 's'}.`,
        })
      }
    }

    /* emerald — savings-rate target streak */
    const hits = series.filter((p) => p.income > 0 && p.net / p.income >= 0.2).length
    if (hits >= 1) {
      out.push({
        severity: 'emerald',
        icon: TrendingUp,
        text: `Your savings rate beat your 20% target ${hits} of the last 6 months.`,
      })
    }

    return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]).slice(0, 3)
  }, [state])
}

function InsightCards() {
  const insights = useInsights()
  if (insights.length === 0) return null
  return (
    <div className="col-span-12 flex gap-4 max-lg:overflow-x-auto max-lg:pb-2 lg:grid lg:grid-cols-3">
      {insights.map((insight, i) => {
        const color = INSIGHT_COLOR[insight.severity]
        const Icon = insight.icon
        return (
          <motion.div
            key={insight.text}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.3, delay: i * 0.08, ease: EASE }}
            className="card-chrome relative flex items-start gap-3 overflow-hidden p-5 pl-6 max-lg:min-w-[280px]"
          >
            <motion.span
              aria-hidden
              className="absolute inset-y-0 left-0 w-[3px] origin-top"
              style={{ backgroundColor: color }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: 'easeOut' }}
            />
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}14`, border: `1px solid ${color}33` }}
            >
              <Icon size={15} style={{ color }} />
            </span>
            <p className="text-sm leading-relaxed text-light/90">{insight.text}</p>
          </motion.div>
        )
      })}
    </div>
  )
}
