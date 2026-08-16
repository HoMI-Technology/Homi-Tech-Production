import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useBudget } from '@/store/budget'
import type { Goal } from '@/store/budget'
import { GOAL_ICONS, GOAL_ICON_OPTIONS, goalIconKeyFor, saveGoalIcon } from '@/components/goals/goalIcons'
import type { GoalIconKey } from '@/components/goals/goalIcons'
import { cn } from '@/lib/utils'

export const GOAL_COLORS = ['#22d3ee', '#34d399', '#fab633', '#a78bfa', '#f472b6', '#60a5fa'] as const

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ---------------- shared shell ---------------- */

function ModalShell({
  open,
  onClose,
  maxWidth,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  maxWidth: number
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="goal-underlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-navyLight/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="goal-panel"
            initial={{ y: 24, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="max-h-[92dvh] w-full overflow-y-auto rounded-2xl border border-white/[0.1] bg-navyLight p-6 shadow-2xl"
            style={{ maxWidth }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-h3">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-sm text-light tnum placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50'

/* ---------------- goal add/edit modal (goals.md §5) ---------------- */

export function GoalModal({
  open,
  editing,
  onClose,
}: {
  open: boolean
  editing: Goal | null
  onClose: () => void
}) {
  const { addGoal, updateGoal } = useBudget()
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('')
  const [monthly, setMonthly] = useState('')
  const [deadline, setDeadline] = useState('')
  const [color, setColor] = useState<string>(GOAL_COLORS[0])
  const [icon, setIcon] = useState<GoalIconKey>('Home')
  const [errors, setErrors] = useState<{ name?: string; target?: string }>({})
  const [shakeKey, setShakeKey] = useState(0)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setName(editing.name)
      setTarget(String(editing.target))
      setSaved(String(editing.saved))
      setMonthly(String(editing.monthlyContribution))
      setDeadline(editing.deadline ?? '')
      setColor(editing.color)
      setIcon(goalIconKeyFor(editing) ?? 'Home')
    } else {
      setName('')
      setTarget('')
      setSaved('0')
      setMonthly('')
      setDeadline('')
      setColor(GOAL_COLORS[0])
      setIcon('Home')
    }
    setErrors({})
    const t = setTimeout(() => nameRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [open, editing])

  const save = () => {
    const targetValue = parseFloat(target)
    const nextErrors: { name?: string; target?: string } = {}
    if (!name.trim()) nextErrors.name = 'Give your goal a name'
    if (!Number.isFinite(targetValue) || targetValue <= 0) nextErrors.target = 'Enter a target greater than $0'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setShakeKey((k) => k + 1)
      return
    }
    const savedValue = Math.max(0, parseFloat(saved) || 0)
    const monthlyValue = Math.max(0, parseFloat(monthly) || 0)
    const payload = {
      name: name.trim(),
      target: Math.round(targetValue * 100) / 100,
      saved: Math.min(savedValue, Math.round(targetValue * 100) / 100),
      monthlyContribution: Math.round(monthlyValue * 100) / 100,
      deadline: deadline || undefined,
      color,
    }
    if (editing) {
      updateGoal(editing.id, payload)
      saveGoalIcon(editing.id, icon)
    } else {
      const created = addGoal(payload)
      saveGoalIcon(created.id, icon)
    }
    onClose()
  }

  return (
    <ModalShell open={open} onClose={onClose} maxWidth={480} title={editing ? 'Edit goal' : 'New goal'}>
      <motion.div
        key={shakeKey}
        animate={shakeKey > 0 ? { x: [0, -6, 6, -6, 6, 0] } : undefined}
        transition={{ duration: 0.3 }}
      >
        {/* name */}
        <label className="text-label mt-5 block">Goal name</label>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. House Down Payment"
          className={cn(inputClass, errors.name && 'border-crimson/60')}
        />
        {errors.name && <p className="mt-1 text-xs text-crimson">{errors.name}</p>}

        {/* target + saved */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-label block">Target amount</label>
            <div
              className={cn(
                'mt-1.5 flex items-center rounded-xl border bg-white/[0.03] px-3.5 focus-within:ring-2 focus-within:ring-cyan-400/50',
                errors.target ? 'border-crimson/60' : 'border-white/[0.1]',
              )}
            >
              <span className="font-display text-sm text-dim">$</span>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal"
                placeholder="60,000"
                className="w-full bg-transparent py-2.5 pl-1.5 font-display text-sm font-semibold text-light tnum placeholder:text-dim/50 focus:outline-none"
              />
            </div>
            {errors.target && <p className="mt-1 text-xs text-crimson">{errors.target}</p>}
          </div>
          <div>
            <label className="text-label block">Starting saved</label>
            <div className="mt-1.5 flex items-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 focus-within:ring-2 focus-within:ring-cyan-400/50">
              <span className="font-display text-sm text-dim">$</span>
              <input
                value={saved}
                onChange={(e) => setSaved(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal"
                placeholder="0"
                className="w-full bg-transparent py-2.5 pl-1.5 font-display text-sm font-semibold text-light tnum placeholder:text-dim/50 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* monthly + deadline */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-label block">Monthly contribution</label>
            <div className="mt-1.5 flex items-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 focus-within:ring-2 focus-within:ring-cyan-400/50">
              <span className="font-display text-sm text-dim">$</span>
              <input
                value={monthly}
                onChange={(e) => setMonthly(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal"
                placeholder="500"
                className="w-full bg-transparent py-2.5 pl-1.5 font-display text-sm font-semibold text-light tnum placeholder:text-dim/50 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-label block">Deadline · optional</label>
            <input
              type="date"
              value={deadline}
              min={todayIso()}
              onChange={(e) => setDeadline(e.target.value)}
              className={cn(inputClass, '[color-scheme:dark]')}
            />
          </div>
        </div>
      </motion.div>

      {/* color swatches */}
      <label className="text-label mt-4 block">Color</label>
      <div className="mt-2 flex gap-2.5">
        {GOAL_COLORS.map((c) => {
          const active = color === c
          return (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Goal color ${c}`}
              className="relative flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-105"
            >
              {active && (
                <motion.span
                  layoutId="goal-color-ring"
                  className="absolute inset-0 rounded-full border-2"
                  style={{ borderColor: c, boxShadow: `0 0 12px ${c}55` }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="h-5 w-5 rounded-full" style={{ backgroundColor: c }} />
            </button>
          )
        })}
      </div>

      {/* icon picker */}
      <label className="text-label mt-4 block">Icon</label>
      <div className="mt-2 grid grid-cols-8 gap-1.5 max-sm:grid-cols-4">
        {GOAL_ICON_OPTIONS.map((key) => {
          const Icon = GOAL_ICONS[key]
          const active = icon === key
          return (
            <button
              key={key}
              onClick={() => setIcon(key)}
              aria-label={`Icon ${key}`}
              className={cn(
                'flex items-center justify-center rounded-xl border py-2.5 transition-colors',
                active ? 'border-white/[0.14] bg-white/[0.06]' : 'border-transparent hover:bg-white/[0.04]',
              )}
              style={active ? { borderColor: `${color}55`, backgroundColor: `${color}14` } : undefined}
            >
              <Icon size={16} style={{ color: active ? color : '#94a3b8' }} />
            </button>
          )
        })}
      </div>

      {/* footer */}
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-sm font-medium text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
        >
          Cancel
        </button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={save}
          className="rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-glow-cyan"
        >
          {editing ? 'Save goal' : 'Create goal'}
        </motion.button>
      </div>
    </ModalShell>
  )
}

/* ---------------- contribute modal (goals.md §4) ---------------- */

const QUICK_AMOUNTS = [50, 100, 250, 500]

export function ContributeModal({
  goal,
  onClose,
  onContribute,
}: {
  goal: Goal | null
  onClose: () => void
  onContribute: (goal: Goal, amount: number) => void
}) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string>()
  const [shakeKey, setShakeKey] = useState(0)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!goal) return
    setAmount('')
    setError(undefined)
    const t = setTimeout(() => amountRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [goal])

  const remaining = goal ? Math.max(0, goal.target - goal.saved) : 0

  const save = () => {
    if (!goal) return
    const value = parseFloat(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than $0')
      setShakeKey((k) => k + 1)
      return
    }
    onContribute(goal, Math.round(value * 100) / 100)
    onClose()
  }

  return (
    <ModalShell open={goal !== null} onClose={onClose} maxWidth={400} title={`Contribute — ${goal?.name ?? ''}`}>
      <motion.div
        key={shakeKey}
        animate={shakeKey > 0 ? { x: [0, -6, 6, -6, 6, 0] } : undefined}
        transition={{ duration: 0.3 }}
      >
        <label className="text-label mt-5 block">Amount</label>
        <div
          className={cn(
            'mt-1.5 flex items-center rounded-xl border bg-white/[0.03] px-4 focus-within:ring-2 focus-within:ring-cyan-400/50',
            error ? 'border-crimson/60' : 'border-white/[0.1]',
          )}
        >
          <span className="font-display text-xl text-dim">$</span>
          <input
            ref={amountRef}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^0-9.]/g, ''))
              setError(undefined)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
            }}
            inputMode="decimal"
            placeholder="0.00"
            className="w-full bg-transparent py-3 pl-2 font-display text-2xl font-semibold text-light tnum placeholder:text-dim/50 focus:outline-none"
          />
        </div>
        {error && <p className="mt-1 text-xs text-crimson">{error}</p>}

        {/* quick chips */}
        <div className="mt-3 flex gap-2">
          {QUICK_AMOUNTS.map((v) => (
            <button
              key={v}
              onClick={() => {
                setAmount(String(v))
                setError(undefined)
              }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                parseFloat(amount) === v
                  ? 'border-cyan/40 bg-cyan/10 text-cyan'
                  : 'border-white/[0.08] text-dim hover:bg-white/[0.05] hover:text-light',
              )}
            >
              ${v}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-dim">
          This adds an expense entry under <span className="text-light">Savings</span> so your dashboard cash flow
          updates live. {remaining > 0 && <>{goal?.name} has <span className="text-light">${remaining.toLocaleString('en-US')}</span> to go.</>}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={save}
            className="rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-glow-cyan"
          >
            Contribute
          </motion.button>
        </div>
      </motion.div>
    </ModalShell>
  )
}
