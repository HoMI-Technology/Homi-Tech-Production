import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, Landmark, Pencil, Trash2 } from 'lucide-react'
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  TEMP_HEX,
  TEMP_WORD,
  balanceSeries,
  cashFlowTemperature,
  categoryById,
  debtToIncome,
  dtiTemperature,
  fmt,
  fmtCompact,
  fmtPct,
  fmtSigned,
  monthElapsedFraction,
  monthExpenses,
  monthIncome,
  monthLabel,
  monthlySeries,
  netCashFlow,
  netWorthSeries,
  runwayMonths,
  runwayTemperature,
  savingsRate,
  savingsTemperature,
  spendingByCategory,
  totalNetWorth,
  transactionsInMonth,
  useBudget,
} from '@/store/budget'
import type { Goal, Transaction } from '@/store/budget'
import { centsToDollars, dollarsToCents, sumCents } from '@/lib/money'
import AnimatedNumber from '@/components/AnimatedNumber'
import PulseDot from '@/components/PulseDot'
import KpiCard from '@/components/KpiCard'
import ChartTooltip from '@/components/ChartTooltip'
import EmptyState from '@/components/EmptyState'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useTransactionModal } from '@/components/TransactionModal'
import { categoryIcon } from '@/components/CategoryIcon'
import { cn } from '@/lib/utils'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function Overview() {
  const { state, monthOffset } = useBudget()
  const navigate = useNavigate()

  const income = monthIncome(state, monthOffset)
  const expenses = monthExpenses(state, monthOffset)
  const remaining = netCashFlow(state, monthOffset)
  const rate = savingsRate(state, monthOffset)
  const prevRate = savingsRate(state, monthOffset - 1)
  const runway = runwayMonths(state)
  const dti = debtToIncome(state, monthOffset)
  const netWorth = totalNetWorth(state)
  const nwSeries = useMemo(() => netWorthSeries(state), [state])
  const nwDelta = nwSeries.length > 1 ? nwSeries[nwSeries.length - 1] - nwSeries[nwSeries.length - 2] : 0

  return (
    <div className="grid grid-cols-12 gap-4">
      <HeroCard income={income} expenses={expenses} debt={state.monthlyDebtPayments} remaining={remaining} rate={rate} />
      <FreeCashCard />

      {/* KPI row */}
      <div className="col-span-12 sm:col-span-6 lg:col-span-3">
        <KpiCard
          index={0}
          label="Savings Rate"
          value={rate * 100}
          format={(n) => `${n.toFixed(1)}%`}
          temperature={savingsTemperature(rate)}
          delta={{ text: `${rate - prevRate >= 0 ? '+' : ''}${((rate - prevRate) * 100).toFixed(1)} pts vs ${monthLabel(monthOffset - 1).slice(0, 3)}`, positive: rate >= prevRate }}
          meter={{ fraction: Math.max(0, Math.min(1, rate / 0.3)), ticks: [1 / 3, 2 / 3] }}
          onClick={() => navigate('/goals#analytics')}
        />
      </div>
      <div className="col-span-12 sm:col-span-6 lg:col-span-3">
        <KpiCard
          index={1}
          label="Emergency Runway"
          value={runway}
          format={(n) => `${n.toFixed(1)} mo`}
          temperature={runwayTemperature(runway)}
          caption="liquid savings ÷ monthly outflow"
          meter={{ fraction: Math.max(0, Math.min(1, runway / 9)), ticks: [3 / 9, 6 / 9] }}
          onClick={() => navigate('/goals#analytics')}
        />
      </div>
      <div className="col-span-12 sm:col-span-6 lg:col-span-3">
        <KpiCard
          index={2}
          label="Debt-to-Income"
          value={dti * 100}
          format={(n) => `${n.toFixed(1)}%`}
          temperature={dtiTemperature(dti)}
          meter={{ fraction: Math.max(0, Math.min(1, dti / 0.5)), ticks: [0.28 / 0.5, 0.36 / 0.5, 0.43 / 0.5] }}
          onClick={() => navigate('/goals#analytics')}
        />
      </div>
      <div className="col-span-12 sm:col-span-6 lg:col-span-3">
        <KpiCard
          index={3}
          label="Net Worth"
          value={netWorth}
          format={(n) => fmt(n)}
          temperature={cashFlowTemperature(rate)}
          delta={{ text: `${fmtSigned(nwDelta, 0)} this month`, positive: nwDelta >= 0 }}
          spark={nwSeries}
          onClick={() => navigate('/investments')}
        />
      </div>

      <CashFlowCard />
      <DonutCard />
      <RecentActivityCard />
      <GoalSnapshotCard />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Hero — live remaining balance                                       */
/* ------------------------------------------------------------------ */

function HeroCard({
  income,
  expenses,
  debt,
  remaining,
  rate,
}: {
  income: number
  expenses: number
  debt: number
  remaining: number
  rate: number
}) {
  const { state, monthOffset } = useBudget()
  const navigate = useNavigate()
  const temperature = cashFlowTemperature(rate)
  const series = useMemo(() => balanceSeries(state, monthOffset), [state, monthOffset])

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="card-chrome card-hairline-top relative col-span-12 overflow-hidden p-6 lg:col-span-8 lg:p-8"
    >
      {/* radial glow behind the number */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.10), transparent 70%)' }}
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
        {/* left: balance */}
        <div className="lg:w-[55%]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <PulseDot color={TEMP_HEX.emerald} size={7} />
            <span className="text-label">Remaining balance — {monthLabel(monthOffset)}</span>
            <span className="text-xs text-dim">income − expenses − debt payments</span>
          </div>
          <AnimatedNumber
            value={remaining}
            format={(n) => fmt(n)}
            className={cn(
              'text-hero-number mt-3 block max-md:!text-4xl',
              remaining < 0 ? 'text-crimson [text-shadow:0_0_28px_rgba(242,72,34,0.35)]' : 'text-light',
            )}
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <MiniStat icon={ArrowDownLeft} iconClass="text-cyan" label="Income" value={fmt(income)} onClick={() => navigate('/transactions?type=income')} />
            <span className="h-4 w-px bg-white/[0.08]" />
            <MiniStat icon={ArrowUpRight} iconClass="text-crimson" label="Expenses" value={fmt(expenses)} onClick={() => navigate('/transactions?type=expense')} />
            <span className="h-4 w-px bg-white/[0.08]" />
            <MiniStat icon={Landmark} iconClass="text-dim" label="Debt payments" value={fmt(debt)} />
          </div>
        </div>

        {/* center-right: 30-day sparkline */}
        <div className="lg:w-[30%]">
          <BalanceSpark values={series} negative={remaining < 0} />
        </div>

        {/* far right: temperature badge */}
        <div className="flex flex-row items-center gap-3 lg:w-[15%] lg:flex-col lg:items-end lg:gap-2" title={`Cash-flow ratio ≥15% = Healthy · ≥5% = Caution · ≥0% = Watch · below = At risk (now ${fmtPct(rate)})`}>
          <PulseDot temperature={temperature} size={14} />
          <span className="text-label" style={{ color: TEMP_HEX[temperature] }}>
            {TEMP_WORD[temperature]}
          </span>
          <span className="text-[10px] text-dim">cash-flow {fmtPct(rate)}</span>
        </div>
      </div>
    </motion.section>
  )
}

/* ------------------------------------------------------------------ */
/* Free cash — income − net expenses − goal reserve (canon vocabulary) */
/* ------------------------------------------------------------------ */

function FreeCashCard() {
  const { state, monthOffset } = useBudget()
  const navigate = useNavigate()

  // Cents-safe math: convert at the boundary, sum in cents, convert back
  // for display only (lib/money.ts).
  const incomeCents = dollarsToCents(monthIncome(state, monthOffset))
  const netExpenseCents = dollarsToCents(monthExpenses(state, monthOffset))
  const goalReserveCents = sumCents(state.goals.map((g) => dollarsToCents(g.monthlyContribution)))
  const freeCashCents = incomeCents - netExpenseCents - goalReserveCents

  const freeCash = centsToDollars(freeCashCents)
  const netExpenses = centsToDollars(netExpenseCents)
  const reserve = centsToDollars(goalReserveCents)
  // Canon: net expenses below zero is a net adjustment, never negative spending.
  const isNetCredit = netExpenseCents < 0

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
      className="card-chrome card-hairline-top relative col-span-12 overflow-hidden p-6 lg:col-span-4"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.08), transparent 70%)' }}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-label">Free cash — {monthLabel(monthOffset)}</span>
        </div>
        <AnimatedNumber
          value={freeCash}
          format={(n) => fmt(n)}
          className={cn(
            'text-kpi mt-3 block !text-4xl',
            freeCash < 0 ? 'text-crimson [text-shadow:0_0_28px_rgba(242,72,34,0.35)]' : 'text-light',
          )}
        />
        <p className="mt-1 text-xs text-dim">income − {isNetCredit ? 'net credit' : 'net expenses'} − goals</p>

        <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-dim">Income</span>
            <span className="text-data-sm text-light">{fmt(centsToDollars(incomeCents))}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            {/* "Net credit" when refunds/credits outpace spending — never "negative spending". */}
            <span className="text-dim">{isNetCredit ? 'Net credit' : 'Net expenses'}</span>
            <span className="text-data-sm text-light">
              {isNetCredit ? `+${fmt(Math.abs(netExpenses))}` : fmt(netExpenses)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-dim">Goals this month</span>
            <span className="text-data-sm text-light">{fmt(reserve)}</span>
          </div>
        </div>

        <p className="mt-auto pt-4 text-xs text-dim">
          {fmt(reserve)} already spoken for by your goals.{' '}
          <button onClick={() => navigate('/goals')} className="font-medium text-cyan hover:underline">
            Review goals →
          </button>
        </p>
      </div>
    </motion.section>
  )
}

function MiniStat({
  icon: Icon,
  iconClass,
  label,
  value,
  onClick,
}: {
  icon: typeof ArrowDownLeft
  iconClass: string
  label: string
  value: string
  onClick?: () => void
}) {
  const inner = (
    <>
      <Icon size={14} className={iconClass} />
      <span className="text-xs text-dim">{label}</span>
      <span className="text-data-sm text-light">{value}</span>
    </>
  )
  if (onClick) {
    return (
      <button onClick={onClick} className="flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-white/[0.05]">
        {inner}
      </button>
    )
  }
  return <div className="flex items-center gap-1.5 px-1 py-0.5">{inner}</div>
}

function BalanceSpark({ values, negative }: { values: number[]; negative: boolean }) {
  const end = values.length > 0 ? values[values.length - 1] : 0
  if (values.length < 2) return <div className="h-[72px]" />
  const w = 220
  const h = 72
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const range = max - min || 1
  const x = (i: number) => (i / (values.length - 1)) * w
  const y = (v: number) => h - 4 - ((v - min) / range) * (h - 10)
  const pts = values.map((v, i) => `${x(i)},${y(v)}`)
  const zeroY = y(0)
  const color = negative ? TEMP_HEX.crimson : '#22d3ee'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[72px] w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="balance-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill="url(#balance-spark-fill)" />
      <line x1="0" x2={w} y1={zeroY} y2={zeroY} stroke={negative ? TEMP_HEX.crimson : 'rgba(226,232,240,0.15)'} strokeWidth="1" strokeDasharray="3 3" />
      <motion.polyline
        key={values.join(',')}
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      <motion.circle
        key={`dot-${end.toFixed(2)}`}
        cx={w}
        cy={y(end)}
        r="3.5"
        fill={color}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        initial={{ scale: 1.6 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4 }}
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Cash flow — 6-month composed chart                                  */
/* ------------------------------------------------------------------ */

function CashFlowCard() {
  const { state } = useBudget()
  const data = useMemo(() => monthlySeries(state, 6), [state])

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2, ease: EASE }}
      className="card-chrome col-span-12 p-5 lg:col-span-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-h2">Cash flow</h2>
          <p className="mt-0.5 text-xs text-dim">Income vs spending, last 6 months</p>
        </div>
        <div className="flex items-center gap-3">
          <LegendChip color="#22d3ee" label="Income" />
          <LegendChip color={TEMP_HEX.crimson} label="Spending" />
          <LegendChip color={TEMP_HEX.emerald} label="Net" />
        </div>
      </div>
      <div className="mt-4 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="cf-income" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cf-spending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TEMP_HEX.crimson} stopOpacity={0.16} />
                <stop offset="100%" stopColor={TEMP_HEX.crimson} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(226,232,240,0.05)" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em' }} axisLine={false} tickLine={false} dy={6} />
            <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(226,232,240,0.2)', strokeDasharray: '4 4' }} />
            <ReferenceLine y={0} stroke="rgba(226,232,240,0.15)" />
            <Area type="monotone" dataKey="income" name="Income" stroke="#22d3ee" strokeWidth={2} fill="url(#cf-income)" animationDuration={700} dot={false} activeDot={{ r: 3, fill: '#22d3ee', stroke: 'none' }} />
            <Area type="monotone" dataKey="spending" name="Spending" stroke={TEMP_HEX.crimson} strokeWidth={2} fill="url(#cf-spending)" animationDuration={700} animationBegin={100} dot={false} activeDot={{ r: 3, fill: TEMP_HEX.crimson, stroke: 'none' }} />
            <Line type="monotone" dataKey="net" name="Net" stroke={TEMP_HEX.emerald} strokeWidth={2} strokeDasharray="4 4" animationDuration={900} dot={false} activeDot={{ r: 3, fill: TEMP_HEX.emerald, stroke: 'none' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  )
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-dim">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Spending by category — donut                                        */
/* ------------------------------------------------------------------ */

function DonutCard() {
  const { state, monthOffset } = useBudget()
  const navigate = useNavigate()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const spend = useMemo(() => spendingByCategory(state, monthOffset), [state, monthOffset])
  const total = spend.reduce((s, c) => s + c.total, 0)
  const data = spend.map((c) => ({ name: c.category.name, value: Math.round(c.total * 100) / 100, fill: c.category.color }))
  const active = activeIndex !== null ? spend[activeIndex] : null
  const legendRows = spend.slice(0, 6)
  const moreCount = spend.length - legendRows.length

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.26, ease: EASE }}
      className="card-chrome col-span-12 p-5 lg:col-span-4"
    >
      <h2 className="text-h2">Spending by category</h2>
      <p className="mt-0.5 text-xs text-dim">
        {monthLabel(monthOffset)} · {fmt(total)} total
      </p>

      {spend.length === 0 ? (
        <EmptyState compact illustration={false} line="No spending recorded this month." caption="Add an expense to see the breakdown." />
      ) : (
        <>
          <div className="relative mx-auto mt-2 h-[190px] w-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="92%"
                  paddingAngle={2}
                  cornerRadius={3}
                  strokeWidth={0}
                  animationDuration={600}
                  animationEasing="ease-out"
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={entry.fill}
                      opacity={activeIndex === null || activeIndex === i ? 1 : 0.35}
                      style={{ transition: 'opacity 200ms', cursor: 'pointer' }}
                      onMouseEnter={() => setActiveIndex(i)}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <AnimatePresence mode="wait" initial={false}>
                {active ? (
                  <motion.div key={`active-${active.category.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <p className="text-kpi !text-[20px] text-light">{fmt(active.total)}</p>
                    <p className="text-label mt-1" style={{ color: active.category.color }}>{active.category.name}</p>
                  </motion.div>
                ) : (
                  <motion.div key="total" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <p className="text-kpi !text-[20px] text-light">{fmt(total)}</p>
                    <p className="text-label mt-1">Total spent</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-3 flex flex-col">
            {legendRows.map((row, i) => (
              <motion.button
                key={row.category.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.3 + i * 0.05 }}
                onMouseEnter={() => setActiveIndex(spend.indexOf(row))}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={() => navigate(`/transactions?category=${row.category.id}`)}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.category.color }} />
                <span className="text-sm text-light">{row.category.name}</span>
                <span className="ml-auto text-data-sm text-light">{fmt(row.total)}</span>
                <span className="w-10 text-right text-xs text-dim">{fmtPct(row.share, 0)}</span>
              </motion.button>
            ))}
            {moreCount > 0 && <p className="px-2 pt-1 text-xs text-dim">{moreCount} more</p>}
          </div>

          <PaceStrip offset={monthOffset} />
        </>
      )}
    </motion.section>
  )
}

/**
 * Month-pacing tick: actual budgeted spending vs plan, with an elapsed-
 * fraction marker (a month in progress is judged against elapsed days,
 * never the whole month). Crimson is reserved for genuinely over pace.
 */
function PaceStrip({ offset }: { offset: number }) {
  const { state } = useBudget()
  const budgeted = spendingByCategory(state, offset).filter((c) => (c.category.budget ?? 0) > 0)
  if (budgeted.length === 0) return null

  const plannedCents = sumCents(budgeted.map((c) => dollarsToCents(c.category.budget ?? 0)))
  const actualCents = sumCents(budgeted.map((c) => dollarsToCents(c.total)))
  if (plannedCents <= 0) return null

  const used = actualCents / plannedCents
  const elapsed = monthElapsedFraction(offset)
  const overPace = used > elapsed

  return (
    <div className="mt-4 border-t border-white/[0.06] pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-label">Month pace</span>
        <span className="text-xs text-dim">
          {fmtPct(used, 0)} of planned · {fmtPct(elapsed, 0)} of month elapsed
        </span>
      </div>
      <div className="relative mt-2.5 h-[6px] rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(1, used) * 100}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={cn('h-full rounded-full', overPace ? 'bg-crimson' : 'bg-emerald')}
        />
        {/* elapsed-fraction tick */}
        <span
          className="absolute top-1/2 h-[12px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-light/80"
          style={{ left: `${elapsed * 100}%` }}
          title={`${fmtPct(elapsed, 0)} of the month has elapsed`}
        />
      </div>
      <p className="mt-2 text-xs text-dim">
        {overPace
          ? 'Ahead of pace — worth a look at the categories above.'
          : 'On pace with the month so far.'}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Recent activity                                                     */
/* ------------------------------------------------------------------ */

function RecentActivityCard() {
  const { state, monthOffset, deleteTransaction } = useBudget()
  const { openEditModal, openAddModal } = useTransactionModal()
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null)

  const recent = useMemo(() => {
    const source = monthOffset === 0 ? state.transactions : transactionsInMonth(state, monthOffset)
    return [...source].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)).slice(0, 6)
  }, [state, monthOffset])

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.32, ease: EASE }}
      className="card-chrome col-span-12 p-5 lg:col-span-7"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-h2">Recent activity</h2>
        <Link to="/transactions" className="text-sm font-medium text-cyan hover:underline">
          View all →
        </Link>
      </div>

      {recent.length === 0 ? (
        <EmptyState
          compact
          line="Nothing here yet — your readiness starts with one entry."
          caption="Add your first transaction to start the ledger."
          actionLabel="Add transaction"
          onAction={() => openAddModal()}
        />
      ) : (
        <div className="mt-2 flex flex-col">
          <AnimatePresence initial={false}>
            {recent.map((tx, i) => {
              const cat = categoryById(state, tx.categoryId)
              const Icon = categoryIcon(cat?.icon ?? 'Tag')
              const color = cat?.color ?? '#94a3b8'
              return (
                <motion.div
                  key={tx.id}
                  layout="position"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={cn('group flex items-center gap-3 py-3', i < recent.length - 1 && 'border-b border-white/[0.06]')}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1f` }}>
                    <Icon size={16} style={{ color }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-light">{tx.description}</p>
                    <p className="text-xs text-dim">{cat?.name ?? 'Uncategorized'}</p>
                  </div>
                  <span className="hidden text-xs text-dim sm:block">
                    {new Date(`${tx.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className={cn('text-data-sm w-24 text-right', tx.type === 'expense' ? 'text-crimson' : 'text-cyan')}>
                    {tx.type === 'expense' ? `−${fmt(tx.amount, 2)}` : `+${fmt(tx.amount, 2)}`}
                  </span>
                  <span className="flex w-14 shrink-0 justify-end gap-1 opacity-0 transition-opacity [transition-duration:120ms] group-hover:opacity-100">
                    <button
                      onClick={() => openEditModal(tx)}
                      className="rounded-md p-1.5 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
                      aria-label="Edit transaction"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setPendingDelete(tx)}
                      className="rounded-md p-1.5 text-dim transition-colors hover:bg-crimson/10 hover:text-crimson"
                      aria-label="Delete transaction"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this transaction?"
        body={pendingDelete ? `"${pendingDelete.description}" will be removed from your ledger. You can undo for a few seconds after deleting.` : ''}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteTransaction(pendingDelete.id)}
      />
    </motion.section>
  )
}

/* ------------------------------------------------------------------ */
/* Goal snapshot — auto-cycling featured goal                          */
/* ------------------------------------------------------------------ */

function GoalSnapshotCard() {
  const { state } = useBudget()
  const goals = state.goals
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const ordered = useMemo(
    () =>
      [...goals].sort((a, b) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return a.deadline < b.deadline ? -1 : 1
      }),
    [goals],
  )

  useEffect(() => {
    if (paused || ordered.length <= 1) return
    const t = setInterval(() => setIndex((i) => (i + 1) % ordered.length), 8000)
    return () => clearInterval(t)
  }, [paused, ordered.length])

  const featured: Goal | undefined = ordered[index % Math.max(ordered.length, 1)]
  const others = ordered.filter((g) => g.id !== featured?.id).slice(0, 2)

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.38, ease: EASE }}
      className="card-chrome col-span-12 flex flex-col p-5 lg:col-span-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-h2">Goals</h2>
        <Link to="/goals" className="text-sm font-medium text-cyan hover:underline">
          Manage →
        </Link>
      </div>

      {!featured ? (
        <EmptyState compact illustration={false} line="No goals yet — name the thing you're getting ready for." />
      ) : (
        <>
          <div className="relative mt-4 min-h-[92px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={featured.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-light">{featured.name}</p>
                  <p className="text-data-sm text-light">
                    {fmt(featured.saved)} <span className="text-dim">of {fmt(featured.target)}</span>
                  </p>
                </div>
                <GoalBar goal={featured} />
                <p className="mt-1.5 text-xs text-dim">{paceLine(featured)}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {others.map((g) => {
              const pct = g.target > 0 ? g.saved / g.target : 0
              return (
                <div key={g.id} className="flex items-center gap-3">
                  <GoalRing pct={pct} color={g.color} />
                  <span className="text-sm text-light">{g.name}</span>
                  <span className="ml-auto text-data-sm text-dim">{fmtPct(pct, 0)}</span>
                </div>
              )
            })}
          </div>

          <p className="mt-auto pt-5 font-serif italic text-sm text-dim">“Know when you're ready.”</p>
        </>
      )}
    </motion.section>
  )
}

function paceLine(goal: Goal): string {
  const pct = goal.target > 0 ? goal.saved / goal.target : 0
  const remaining = Math.max(0, goal.target - goal.saved)
  if (goal.monthlyContribution <= 0 || remaining === 0) return `${fmtPct(pct, 0)} · fully funded`
  const months = Math.ceil(remaining / goal.monthlyContribution)
  const projected = new Date()
  projected.setMonth(projected.getMonth() + months)
  const label = projected.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return `${fmtPct(pct, 0)} · on pace for ${label} at ${fmt(goal.monthlyContribution)}/mo`
}

function GoalBar({ goal }: { goal: Goal }) {
  const pct = goal.target > 0 ? Math.min(1, goal.saved / goal.target) : 0
  return (
    <div className="mt-2.5 h-[10px] overflow-hidden rounded-full bg-white/[0.06]">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct * 100}%` }}
        transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
        className="relative h-full rounded-full"
        style={{ background: `linear-gradient(90deg, #22d3ee, ${TEMP_HEX.emerald})` }}
      >
        <span className="absolute right-0 top-1/2 h-[14px] w-[6px] -translate-y-1/2 rounded-full bg-emerald shadow-glow-emerald" />
      </motion.div>
    </div>
  )
}

function GoalRing({ pct, color }: { pct: number; color: string }) {
  const r = 14
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, pct))
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0 -rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(226,232,240,0.08)" strokeWidth="3.5" />
      <motion.circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - clamped) }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </svg>
  )
}
