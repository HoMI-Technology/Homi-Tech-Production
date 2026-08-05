"use client";

/* ------------------------------------------------------------------ */
/* OverviewCommand — the Overview tab surface (spec §3, 11 sections).  */
/*                                                                     */
/* Every number derives live from usePlannerStore through the canon    */
/* libs (score-bridge, derived, digest, stress, receipts, closed-loop) */
/* — mutations only via store actions / closed-loop wrappers.          */
/* ------------------------------------------------------------------ */

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Compass,
  Copy,
  Landmark,
  LineChart,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Trash2,
  X,
} from 'lucide-react'
import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { TEMP_HEX } from "@/lib/planner/palette"
import { usePlannerStore } from "@/lib/planner/store"
import { VERDICT_META } from "@/lib/brand"
import type { PillarKey } from "@/lib/planner/score-result"
import {
  addCheckinWithImpact,
} from '@/lib/planner/closed-loop'
import { buildCashflowSpark, buildSpendDigest } from '@/lib/planner/digest'
import { summarize, todayISO } from '@/lib/planner/derived'
import { analyzeStress } from '@/lib/planner/stress'
import { NUDGE_KIND_LABEL } from '@/lib/planner/nudges'
import type { SignalTab } from '@/lib/planner/signals'
import { PLANNER_CATEGORY_HEX } from '@/lib/planner/types'
import type {
  CategoryId,
  ExpenseCategory,
  IncomeCategory,
  PathSnapshot,
  Transaction,
} from '@/lib/planner/types'
import { downloadReceipt, issueReceipt } from "@/lib/planner/receipts-local"
import {
  fmtDayShort,
  fmtSignedUsd0,
  fmtUsd0,
  fmtUsd2,
  usePlannerIsEmpty,
  usePlannerReality,
  usePlannerScore,
  useBehaviorNudges,
} from "@/components/planner/hooks"

/* ------------------------------------------------------------------ */
/* Local view helpers                                                  */
/* ------------------------------------------------------------------ */

const CATEGORY_LABEL: Record<CategoryId, string> = {
  housing: 'Housing',
  food: 'Food',
  transport: 'Transport',
  utilities: 'Utilities',
  health: 'Health',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  debt: 'Debt',
  other: 'Other',
  salary: 'Salary',
  freelance: 'Freelance',
  investments: 'Investments',
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'food',
  'housing',
  'transport',
  'utilities',
  'health',
  'entertainment',
  'shopping',
  'debt',
  'other',
]
const INCOME_CATEGORIES: IncomeCategory[] = [
  'salary',
  'freelance',
  'investments',
  'other',
]

/**
 * Resolved ratio (done + skipped over non-REASSESS steps) — mirrors the
 * closed-loop projection of canon lib/path.ts pathCompletionRatio.
 * Displayed as "resolved", never "complete".
 */
function pathProgressRatio(path: PathSnapshot): number {
  const steps = path.steps.filter((s) => s.reasonCode !== 'REASSESS')
  if (steps.length === 0) {
    if (path.steps.length === 0) return 1
    const done = path.steps.filter((s) => s.status !== 'pending').length
    return done / path.steps.length
  }
  const done = steps.filter((s) => s.status !== 'pending').length
  return done / steps.length
}

/** Short subscore labels for the pillar breakdown captions. */
const FACTOR_SHORT: Record<string, string> = {
  dti: 'DTI',
  downPayment: 'Down',
  emergencyFund: 'Fund',
  credit: 'Credit',
  lifeStability: 'Stability',
  confidence: 'Confidence',
  partnerAlignment: 'Partner',
  fomo: 'FOMO check',
  timeHorizon: 'Horizon',
  savingsRate: 'Save',
  downPaymentProgress: 'DP progress',
}

type Band = 'STRONG' | 'WATCH' | 'TIGHT'
const BAND_BY_TEMP: Record<string, { label: Band; className: string }> = {
  emerald: { label: 'STRONG', className: 'border-emerald/35 bg-emerald/10 text-emerald' },
  yellow: { label: 'WATCH', className: 'border-amber/35 bg-amber/10 text-amber' },
  amber: { label: 'TIGHT', className: 'border-yellow/40 bg-yellow/10 text-yellow' },
  crimson: { label: 'TIGHT', className: 'border-crimson/40 bg-crimson/10 text-crimson' },
}

function Section({
  eyebrow,
  title,
  caption,
  aside,
  children,
}: {
  eyebrow: string
  title?: string
  caption?: string
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-label uppercase tracking-widest text-dim">
            {eyebrow}
          </p>
          {title && (
            <h2 className="mt-1.5 font-serif text-2xl italic text-light">
              {title}
            </h2>
          )}
          {caption && (
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-dim">
              {caption}
            </p>
          )}
        </div>
        {aside}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 1 — Suggested move                                                  */
/* ------------------------------------------------------------------ */

function SuggestedMove({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: SignalTab) => void
}) {
  const nudges = useBehaviorNudges()
  if (nudges.length === 0) return null
  const [top, ...rest] = nudges

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-label uppercase tracking-widest text-cyan">
          ✦ Suggested move
        </p>
        <p className="text-[11px] text-dim">
          Protective nudges · not pressure tactics
        </p>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="card-chrome card-hairline-top relative flex flex-col p-5 lg:col-span-2"
        >
          <span className="w-fit rounded-full border border-cyan/35 bg-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan">
            {NUDGE_KIND_LABEL[top.kind]}
          </span>
          <h3 className="mt-3 font-serif text-2xl italic text-light">
            {top.title}
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-dim">
            {top.body}
          </p>
          {onNavigateTab && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigateTab(top.actionTab)}
              className="mt-5 w-full rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-navy shadow-glow-cyan"
            >
              {top.actionLabel} →
            </motion.button>
          )}
        </motion.article>

        <div className="flex flex-col gap-4">
          {rest.slice(0, 2).map((nudge) => (
            <article
              key={nudge.id}
              className="card-chrome flex flex-1 flex-col p-4"
            >
              <span className="w-fit rounded-full border border-white/[0.1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-dim">
                {NUDGE_KIND_LABEL[nudge.kind]} — {nudge.title}
              </span>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-dim">
                {nudge.body}
              </p>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab(nudge.actionTab)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan transition-opacity hover:opacity-80"
                >
                  {nudge.actionLabel}
                  <ArrowRight size={12} />
                </button>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 2 — Path strip                                                      */
/* ------------------------------------------------------------------ */

function PathStrip({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: SignalTab) => void
}) {
  const path = usePlannerStore((s) => s.path)
  const regeneratePath = usePlannerStore((s) => s.regeneratePath)

  if (!path) {
    return (
      <section className="mt-6">
        <div className="card-chrome flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-label uppercase tracking-widest text-dim">
              Path habit · first move
            </p>
            <h3 className="mt-1.5 font-serif text-xl italic text-light">
              Generate a protective sequence from live numbers
            </h3>
            <p className="mt-1 text-xs text-dim">
              One binding constraint at a time — not a checklist wall.
            </p>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => regeneratePath()}
            className="shrink-0 rounded-xl bg-cyan px-5 py-2.5 text-sm font-semibold text-navy shadow-glow-cyan"
          >
            Generate Path
          </motion.button>
        </div>
      </section>
    )
  }

  const ratio = pathProgressRatio(path)
  const pct = Math.round(ratio * 100)

  if (ratio >= 1) {
    return (
      <section className="mt-6">
        <div className="card-chrome border-emerald/25 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-label uppercase tracking-widest text-emerald">
              Path · optional maintenance {pct}%
            </p>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('plan')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan transition-opacity hover:opacity-80"
              >
                Full path
                <ArrowRight size={12} />
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-dim">
            Binding: {VERDICT_META[path.verdict].label} — optional review only
          </p>
          <h3 className="mt-2 font-serif text-xl italic text-light">
            Path steps complete — reassess when life moves
          </h3>
        </div>
      </section>
    )
  }

  const total = path.steps.filter((s) => s.reasonCode !== 'REASSESS').length
  const done = path.steps.filter(
    (s) => s.reasonCode !== 'REASSESS' && s.status !== 'pending',
  ).length

  return (
    <section className="mt-6">
      <div className="rounded-2xl border border-emerald/25 bg-emerald/[0.07] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-emerald">
            Path: {VERDICT_META[path.verdict].label} band — {done} of {total}{' '}
            steps resolved
          </p>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('plan')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan transition-opacity hover:opacity-80"
            >
              Open Plan
              <ArrowRight size={12} />
            </button>
          )}
        </div>
        <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full bg-emerald shadow-glow-emerald"
          />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 3 — 30-day cash path + quick actions                                */
/* ------------------------------------------------------------------ */

const QUICK_ACTIONS: Array<{
  tab: SignalTab
  label: string
  hint: string
  icon: typeof CalendarDays
}> = [
  { tab: 'calendar', label: 'Calendar', hint: 'Bills & runway', icon: CalendarDays },
  { tab: 'plan', label: 'Plan', hint: 'Path & models', icon: Compass },
  { tab: 'banking', label: 'Banks', hint: 'Pay bills', icon: Landmark },
  { tab: 'wealth', label: 'Wealth', hint: 'Portfolio', icon: LineChart },
]

function CashPathAndActions({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: SignalTab) => void
}) {
  const transactions = usePlannerStore((s) => s.transactions)
  const planner = usePlannerScore()
  const nextSteps = planner?.nextSteps ?? []
  const spark = useMemo(() => buildCashflowSpark(transactions, 30), [transactions])
  const now = spark.length > 0 ? spark[spark.length - 1].cumulative : 0

  return (
    <Section
      eyebrow="30-day cash path"
      caption="Cumulative ledger flow · last 30 days ending today"
    >
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card-chrome p-5 lg:col-span-3">
          <div className="h-[220px] w-full text-cyan">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={spark} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={['dataMin', 'auto']} />
                <Bar dataKey="net" radius={[3, 3, 0, 0]}>
                  {spark.map((point) => (
                    <Cell
                      key={point.date}
                      fill={point.net >= 0 ? TEMP_HEX.emerald : TEMP_HEX.crimson}
                      fillOpacity={0.75}
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="currentColor"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between font-display text-xs tnum">
            <span className="text-dim">Start $0</span>
            <span className={now >= 0 ? 'text-emerald' : 'text-crimson'}>
              Now {fmtSignedUsd0(now)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ tab, label, hint, icon: Icon }) => (
              <button
                key={tab}
                type="button"
                onClick={() => onNavigateTab?.(tab)}
                className="card-chrome group flex flex-col items-start p-4 text-left transition-colors hover:border-cyan/25"
              >
                <Icon size={16} className="text-cyan" />
                <span className="mt-2 text-sm font-semibold text-light">
                  {label}
                </span>
                <span className="mt-0.5 text-[11px] text-dim">{hint}</span>
              </button>
            ))}
          </div>
          <div className="card-chrome flex-1 p-4">
            <p className="text-label uppercase tracking-widest text-dim">
              Next from score
            </p>
            <ol className="mt-2.5 space-y-2">
              {nextSteps.slice(0, 3).map((step, i) => (
                <li key={step} className="flex gap-2 text-xs leading-relaxed text-dim">
                  <span className="font-display font-medium tnum text-cyan">
                    {i + 1}.
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 4 — START HONEST (empty state only)                                 */
/* ------------------------------------------------------------------ */

function StartHonest({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: SignalTab) => void
}) {
  const isEmpty = usePlannerIsEmpty()
  if (!isEmpty) return null

  const cards: Array<{
    n: number
    title: string
    body: string
    cta: string
    tab: SignalTab | null
  }> = [
    {
      n: 1,
      title: 'Accounts',
      body: 'Add checking and savings balances you trust.',
      cta: 'Open Banks',
      tab: 'banking',
    },
    {
      n: 2,
      title: 'Ledger',
      body: 'Record income and expenses so cash flow is true.',
      cta: 'Stay on Overview',
      tab: null,
    },
    {
      n: 3,
      title: 'Bills',
      body: 'Schedule obligations; pay them to close the loop.',
      cta: 'Open Banks',
      tab: 'banking',
    },
    {
      n: 4,
      title: 'Path',
      body: 'Generate protective steps from live runway, DTI, and cash.',
      cta: 'Open Plan',
      tab: 'plan',
    },
  ]

  return (
    <Section
      eyebrow="Start honest"
      title="Add real numbers — no sample data"
      caption="HōMI scores what you enter. Link cash, log spend, schedule bills, then generate Path to Ready. Educational guidance only — not advice or a lending decision."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.n} className="card-chrome flex flex-col p-4">
            <span className="font-display text-sm font-semibold tnum text-cyan">
              {card.n} · {card.title}
            </span>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-dim">
              {card.body}
            </p>
            {card.tab && onNavigateTab ? (
              <button
                type="button"
                onClick={() => onNavigateTab(card.tab as SignalTab)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan transition-opacity hover:opacity-80"
              >
                {card.cta}
                <ArrowRight size={12} />
              </button>
            ) : (
              <span className="mt-3 text-xs font-medium text-dim">
                {card.cta}
              </span>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 5 — Daily check-in                                                  */
/* ------------------------------------------------------------------ */

function DailyCheckin() {
  const checkins = usePlannerStore((s) => s.checkins)
  const stress = useMemo(() => analyzeStress(checkins), [checkins])
  const [value, setValue] = useState(5)
  const [note, setNote] = useState('')

  const recent = useMemo(
    () =>
      [...checkins]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7),
    [checkins],
  )

  const tiles = [
    { label: 'INDEX', value: String(stress.index) },
    {
      label: 'SLOPE',
      value: `${stress.slope >= 0 ? '+' : ''}${stress.slope.toFixed(2)}`,
    },
    { label: 'MEAN', value: stress.mean.toFixed(1) },
    { label: 'VOL', value: stress.volatility.toFixed(1) },
  ]

  return (
    <Section
      eyebrow="Daily check-in"
      title="Financial stress"
      caption="Slope, level, volatility, and streaks — not a single bad day. Protective, not judgmental."
    >
      <div className="card-chrome p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="rounded-xl border border-white/[0.06] bg-navyLight/60 px-4 py-3"
            >
              <p className="text-label">{tile.label}</p>
              <p className="mt-1.5 font-display text-lg font-semibold tnum text-light">
                {tile.value}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-dim">
          One honest score a day is enough. No judgment — just a signal when
          the pattern changes.
        </p>
        <p className="mt-3 text-sm font-medium text-light">
          Log today&apos;s financial stress (1 calm · 10 overwhelmed).
        </p>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-dim">
            <span>1 calm</span>
            <span className="font-display font-medium tnum text-cyan">
              Today · {value}/10
            </span>
            <span>10 crisis</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            aria-label="Today's financial stress, 1 calm to 10 crisis"
            className="mt-2 w-full accent-cyan"
          />
        </div>

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What's driving it? (optional)"
          className="mt-3 w-full rounded-xl border border-white/[0.08] bg-navyLight/60 px-4 py-2 text-sm text-light placeholder:text-dim/60"
        />

        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            addCheckinWithImpact(value, note || undefined)
            setNote('')
          }}
          className="mt-4 rounded-xl bg-cyan px-5 py-2.5 text-sm font-semibold text-navy shadow-glow-cyan"
        >
          Save check-in
        </motion.button>

        <div className="mt-5 border-t border-white/[0.06] pt-4">
          {recent.length === 0 ? (
            <p className="text-xs text-dim">No check-ins yet.</p>
          ) : (
            <div className="flex items-end gap-1.5" aria-hidden>
              {recent.map((c) => (
                <div
                  key={c.id}
                  title={`${fmtDayShort(c.date)} · ${c.financialStress}/10`}
                  className="w-4 rounded-sm"
                  style={{
                    height: `${8 + c.financialStress * 2.4}px`,
                    backgroundColor:
                      c.financialStress >= 7
                        ? TEMP_HEX.amber
                        : PLANNER_CATEGORY_HEX.freelance,
                    opacity: 0.85,
                  }}
                />
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-dim">
            Last {stress.sampleSize} days · amber bars ≥7 · signals fire on
            slope, streaks, spikes &amp; volatility
          </p>
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 6 — Export pack                                                     */
/* ------------------------------------------------------------------ */

const EXPORT_LEGAL =
  'Educational only — not credit, lending, legal, tax, or investment advice. Band-only receipt · no underlying financials.'

function ExportPack({
  receiptToken,
  onIssueReceipt,
}: {
  receiptToken: string | null
  onIssueReceipt: () => void
}) {
  const planner = usePlannerScore()
  if (!planner) {
    return (
      <Section
        eyebrow="EXPORT PACK"
        title="Share readiness"
        caption="Set a decision profile to issue a band-only receipt."
      />
    )
  }
  const { reality, nw } = usePlannerReality()
  const [copied, setCopied] = useState(false)

  const runwayLabel = Number.isFinite(reality.runwayMonths)
    ? `${reality.runwayMonths.toFixed(1)} mo`
    : '∞'

  const copySummary = async () => {
    const lines = [
      `HōMI Readiness — ${Math.round(planner.score)}/100 · ${VERDICT_META[planner.verdict].label}`,
      `Pillars: Financial ${planner.pillarPct.financial}% · Emotional ${planner.pillarPct.emotional}% · Timing ${planner.pillarPct.timing}%`,
      planner.keyInsight,
      ...planner.nextSteps.slice(0, 3).map((s, i) => `${i + 1}. ${s}`),
      EXPORT_LEGAL,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(lines)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (permissions) — leave the button state honest.
    }
  }

  return (
    <Section
      eyebrow="Export pack"
      title="Share readiness"
      caption="Score, pillars, next steps, and a band-only receipt — shareable artifact."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-chrome flex flex-col justify-center gap-3 p-5">
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => void copySummary()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-slate/60 px-4 py-2.5 text-sm font-semibold text-light transition-colors hover:border-cyan/30"
          >
            {copied ? <Check size={15} className="text-emerald" /> : <Copy size={15} />}
            {copied ? 'Copied' : 'Copy summary'}
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.print()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-navy shadow-glow-cyan"
          >
            <Printer size={15} />
            Print / PDF
          </motion.button>
          <p className="text-[11px] leading-relaxed text-dim">{EXPORT_LEGAL}</p>
        </div>

        <div className="card-chrome card-hairline-top relative p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-label uppercase tracking-widest text-cyan">
              HōMI Readiness
            </p>
            <p className="font-display text-[11px] tnum text-dim">
              NW {fmtUsd0(nw.netWorth)} · Runway {runwayLabel}
            </p>
          </div>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-hero-number text-light">
              {Math.round(planner.score)}
            </span>
            <span className="pb-1.5 font-serif text-lg italic text-emerald">
              {VERDICT_META[planner.verdict].label}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {(
              [
                ['financial', 'FINANCIAL'],
                ['emotional', 'EMOTIONAL'],
                ['timing', 'TIMING'],
              ] as Array<[PillarKey, string]>
            ).map(([key, label]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-20 text-[10px] font-semibold uppercase tracking-wider text-dim">
                  {label}
                </span>
                <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-cyan"
                    style={{ width: `${planner.pillarPct[key]}%` }}
                  />
                </div>
                <span className="font-display text-[11px] tnum text-dim">
                  {planner.pillarPct[key]}%
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-dim">
            {planner.keyInsight}
          </p>
          <ol className="mt-3 space-y-1.5">
            {planner.nextSteps.slice(0, 3).map((step, i) => (
              <li key={step} className="flex gap-2 text-xs leading-relaxed text-dim">
                <span className="font-display font-medium tnum text-cyan">
                  {i + 1}.
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-4 border-t border-white/[0.06] pt-3">
            {receiptToken ? (
              <p className="break-all font-display text-[11px] tnum text-cyan">
                {receiptToken}
              </p>
            ) : (
              <button
                type="button"
                onClick={onIssueReceipt}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan transition-opacity hover:opacity-80"
              >
                <Receipt size={13} />
                Issue band-only receipt
              </button>
            )}
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 7 — Financial Reality gauges + pillar subscores                     */
/* ------------------------------------------------------------------ */

function FinancialReality() {
  const { reality } = usePlannerReality()
  const planner = usePlannerScore()
  if (!planner) {
    return (
      <Section
        eyebrow="Financial Reality"
        title="Live gauges"
        caption="Set a decision profile to see pillar subscores alongside runway, DTI, and cash flow."
      >
        <p className="text-sm text-dim">
          Cash gauges still update from ledger numbers; pillars need a live score.
        </p>
      </Section>
    )
  }

  const gauges = [
    {
      label: 'RUNWAY',
      value: Number.isFinite(reality.runwayMonths)
        ? `${reality.runwayMonths.toFixed(1)} mo`
        : '∞',
      caption: 'Liquid cash ÷ monthly outflow',
      temp: reality.temps.runway,
    },
    {
      label: 'DEBT-TO-INCOME',
      value: `${Math.round(reality.dti)}%`,
      caption: 'Debt payments ÷ income (≤28% emerald)',
      temp: reality.temps.dti,
    },
    {
      label: 'SAVINGS RATE',
      value: `${Math.round(reality.savingsRate)}%`,
      caption: 'Cash flow as % of income (≥20% emerald)',
      temp: reality.temps.savingsRate,
    },
    {
      label: 'CASH FLOW',
      value: fmtUsd0(reality.cashFlow),
      caption: 'Income minus expenses this period',
      temp: reality.temps.cashFlow,
    },
  ]

  const pillarRows: Array<{ key: PillarKey; label: string }> = [
    { key: 'financial', label: 'FINANCIAL REALITY' },
    { key: 'emotional', label: 'EMOTIONAL TRUTH' },
    { key: 'timing', label: 'PERFECT TIMING' },
  ]

  return (
    <Section
      eyebrow="Financial Reality"
      title="Financial Reality"
      caption="Live gauges from your ledger and banks — runway, DTI, savings rate, and cash flow. Same temperature bands as HōMI production."
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {gauges.map((gauge) => {
          const band = BAND_BY_TEMP[gauge.temp]
          return (
            <div key={gauge.label} className="card-chrome p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-label">{gauge.label}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${band.className}`}
                >
                  {band.label}
                </span>
              </div>
              <p className="mt-2.5 font-display text-xl font-semibold tnum text-light">
                {gauge.value}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-dim">
                {gauge.caption}
              </p>
            </div>
          )
        })}
      </div>

      <div className="card-chrome mt-4 space-y-4 p-5">
        {pillarRows.map(({ key, label }) => {
          const pillar = planner.result.pillars[key]
          const pct = Math.round((pillar.total / pillar.max) * 100)
          const caption = pillar.factors
            .map((f) => `${FACTOR_SHORT[f.key] ?? f.label} ${f.pts}/${f.max}`)
            .join(' · ')
          return (
            <div key={key}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-label">{label}</span>
                <span className="font-display text-xs font-medium tnum text-dim">
                  {pillar.total}/{pillar.max}
                </span>
              </div>
              <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, pct)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full bg-cyan"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-dim">{caption}</p>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 8 — Spend digest                                                    */
/* ------------------------------------------------------------------ */

function SpendDigestSection({
  receiptToken,
  onIssueReceipt,
}: {
  receiptToken: string | null
  onIssueReceipt: () => void
}) {
  const transactions = usePlannerStore((s) => s.transactions)
  const digest = useMemo(() => buildSpendDigest(transactions), [transactions])
  const maxCat = Math.max(1, ...digest.topCategories.map((c) => c.amount))
  const up = (digest.deltaPct ?? 0) >= 0

  return (
    <Section
      eyebrow="Spend digest"
      title="What changed this week"
      caption={digest.headline}
      aside={
        <div className="rounded-xl border border-white/[0.06] bg-navyLight/60 px-4 py-3">
          <p className="text-label">LAST 7 DAYS</p>
          <p className="mt-1 font-display text-lg font-semibold tnum text-light">
            {fmtUsd0(digest.totalSpend)}
          </p>
          <p
            className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold ${
              digest.deltaPct == null
                ? 'text-dim'
                : up
                  ? 'text-crimson'
                  : 'text-emerald'
            }`}
          >
            {digest.deltaPct != null && (up ? '↗' : '↘')}
            {digest.deltaPct == null
              ? 'no prior week'
              : `${up ? '+' : '−'}${Math.abs(digest.deltaPct).toFixed(0)}% vs prior`}
          </p>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-chrome p-5">
          <p className="text-label uppercase tracking-widest text-dim">
            Top categories
          </p>
          {digest.topCategories.length === 0 ? (
            <p className="mt-3 text-xs text-dim">No expenses in range.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {digest.topCategories.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium text-light">
                      {CATEGORY_LABEL[cat.category as CategoryId] ?? cat.category}
                    </span>
                    <span className="font-display tnum text-dim">
                      {fmtUsd0(cat.amount)}{' '}
                      <span
                        className={
                          cat.delta > 0
                            ? 'text-crimson'
                            : cat.delta < 0
                              ? 'text-emerald'
                              : 'text-dim'
                        }
                      >
                        ({cat.delta >= 0 ? '+' : '−'}
                        {fmtUsd0(Math.abs(cat.delta))})
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-[4px] overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(cat.amount / maxCat) * 100}%`,
                        backgroundColor:
                          PLANNER_CATEGORY_HEX[cat.category as CategoryId] ??
                          PLANNER_CATEGORY_HEX.other,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="card-chrome grid flex-1 grid-cols-2 gap-4 p-5">
            <div>
              <p className="text-label uppercase tracking-widest text-crimson">
                Rising
              </p>
              {digest.rising.length === 0 ? (
                <p className="mt-2 text-xs text-dim">Up None</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {digest.rising.map((c) => (
                    <li key={c.category} className="text-xs text-dim">
                      {CATEGORY_LABEL[c.category as CategoryId] ?? c.category}{' '}
                      <span className="font-display tnum text-crimson">
                        +{fmtUsd0(c.delta)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-label uppercase tracking-widest text-emerald">
                Falling
              </p>
              {digest.falling.length === 0 ? (
                <p className="mt-2 text-xs text-dim">Down None</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {digest.falling.map((c) => (
                    <li key={c.category} className="text-xs text-dim">
                      {CATEGORY_LABEL[c.category as CategoryId] ?? c.category}{' '}
                      <span className="font-display tnum text-emerald">
                        −{fmtUsd0(Math.abs(c.delta))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card-chrome p-5">
            <p className="text-label uppercase tracking-widest text-dim">
              Readiness receipt
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-dim">
              Band-only share token — verdict + coarse pillars. No balances, no
              identity (demo).
            </p>
            {receiptToken ? (
              <p className="mt-2 break-all font-display text-[11px] tnum text-cyan">
                {receiptToken}
              </p>
            ) : (
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onIssueReceipt}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-cyan/30 px-4 py-2 text-xs font-semibold text-cyan transition-colors hover:bg-cyan/10"
              >
                <Receipt size={13} />
                Issue receipt
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 9 — Add transaction + Savings goal                                  */
/* ------------------------------------------------------------------ */

function AddTransactionCard() {
  const addTransaction = usePlannerStore((s) => s.addTransaction)
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [category, setCategory] = useState<CategoryId>('food')
  const [note, setNote] = useState('')

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  const switchType = (next: 'expense' | 'income') => {
    setType(next)
    setCategory(next === 'expense' ? 'food' : 'salary')
  }

  const submit = () => {
    const value = Number.parseFloat(amount)
    if (!Number.isFinite(value) || value <= 0 || !date) return
    addTransaction({
      type,
      amount: Math.round(value * 100) / 100,
      category,
      note: note.trim() || undefined,
      date,
      source: 'manual',
    })
    setAmount('')
    setNote('')
  }

  return (
    <div className="card-chrome p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-xl border border-white/[0.08] p-0.5">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchType(t)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
                type === t
                  ? 'bg-cyan/15 text-cyan'
                  : 'text-dim hover:text-light'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="rounded-full border border-white/[0.1] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-dim">
          Local save
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-label">Amount</span>
          <div className="mt-1.5 flex items-center rounded-xl border border-white/[0.08] bg-navyLight/60 px-3">
            <span className="text-sm text-dim">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent px-2 py-2 font-display text-sm tnum text-light placeholder:text-dim/60"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-label">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-navyLight/60 px-3 py-2 font-display text-sm tnum text-light"
          />
        </label>
        <label className="block">
          <span className="text-label">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryId)}
            className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-navyLight/60 px-3 py-2 text-sm text-light"
          >
            {categories.map((c) => (
              <option key={c} value={c} className="bg-navyLight">
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-label">Note</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional detail"
            className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-navyLight/60 px-3 py-2 text-sm text-light placeholder:text-dim/60"
          />
        </label>
      </div>

      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={submit}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-navy shadow-glow-cyan"
      >
        <Plus size={15} />
        Add {type}
      </motion.button>
    </div>
  )
}

function SavingsGoalCard() {
  const savingsGoal = usePlannerStore((s) => s.savingsGoal)
  const setSavingsGoal = usePlannerStore((s) => s.setSavingsGoal)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(savingsGoal.name)
  const [target, setTarget] = useState(String(savingsGoal.target))
  const [current, setCurrent] = useState(String(savingsGoal.current))

  const pct =
    savingsGoal.target > 0
      ? Math.min(100, Math.round((savingsGoal.current / savingsGoal.target) * 100))
      : 0
  const toGo = Math.max(0, savingsGoal.target - savingsGoal.current)
  const reached =
    savingsGoal.target <= 0 || savingsGoal.current >= savingsGoal.target

  const save = () => {
    setSavingsGoal({
      name: name.trim() || savingsGoal.name,
      target: Math.max(0, Number.parseFloat(target) || 0),
      current: Math.max(0, Number.parseFloat(current) || 0),
    })
    setEditing(false)
  }

  return (
    <div className="card-chrome p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-light">{savingsGoal.name}</p>
        <button
          type="button"
          onClick={() => {
            setName(savingsGoal.name)
            setTarget(String(savingsGoal.target))
            setCurrent(String(savingsGoal.current))
            setEditing((v) => !v)
          }}
          className="text-xs font-semibold text-cyan transition-opacity hover:opacity-80"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-label">Goal name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-navyLight/60 px-3 py-2 text-sm text-light"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-label">Saved</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-navyLight/60 px-3 py-2 font-display text-sm tnum text-light"
              />
            </label>
            <label className="block">
              <span className="text-label">Target</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-navyLight/60 px-3 py-2 font-display text-sm tnum text-light"
              />
            </label>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={save}
            className="w-full rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-glow-cyan"
          >
            Save goal
          </motion.button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-kpi text-light">
              {fmtUsd0(savingsGoal.current)}
            </span>
            <span className="text-sm text-dim">
              of {fmtUsd0(savingsGoal.target)}
            </span>
          </div>
          <div className="mt-3 h-[8px] overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-cyan to-emerald shadow-glow-emerald"
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-display font-medium tnum text-cyan">
              {pct}% complete
            </span>
            <span className="text-dim">
              {reached ? 'Goal reached' : `${fmtUsd0(toGo)} to go`}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 10 — Spending by category donut                                     */
/* ------------------------------------------------------------------ */

function SpendingDonut() {
  const transactions = usePlannerStore((s) => s.transactions)
  const summary = useMemo(() => summarize(transactions), [transactions])
  const data = summary.categoryBreakdown

  return (
    <Section
      eyebrow="Spending by category"
      aside={
        <span className="font-display text-xl font-semibold tnum text-light">
          {fmtUsd0(summary.expenses)}
        </span>
      }
    >
      <div className="card-chrome p-5">
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-dim">
            Add an expense to see the breakdown.
          </p>
        ) : (
          <div className="grid items-center gap-6 sm:grid-cols-2">
            <div className="mx-auto h-[220px] w-full max-w-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="amount"
                    nameKey="category"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {data.map((entry) => (
                      <Cell
                        key={entry.category}
                        fill={
                          PLANNER_CATEGORY_HEX[entry.category as CategoryId] ??
                          PLANNER_CATEGORY_HEX.other
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2">
              {data.map((entry) => {
                const pct =
                  summary.expenses > 0
                    ? Math.round((entry.amount / summary.expenses) * 100)
                    : 0
                return (
                  <li
                    key={entry.category}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          PLANNER_CATEGORY_HEX[entry.category as CategoryId] ??
                          PLANNER_CATEGORY_HEX.other,
                      }}
                    />
                    <span className="flex-1 text-light">
                      {CATEGORY_LABEL[entry.category as CategoryId] ??
                        entry.category}
                    </span>
                    <span className="font-display text-xs tnum text-dim">
                      {fmtUsd0(entry.amount)}
                    </span>
                    <span className="w-9 text-right font-display text-xs tnum text-dim">
                      {pct}%
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 11 — Transactions                                                   */
/* ------------------------------------------------------------------ */

type TxFilter = 'all' | 'income' | 'expense'

function TransactionRow({ tx }: { tx: Transaction }) {
  const updateTransaction = usePlannerStore((s) => s.updateTransaction)
  const deleteTransaction = usePlannerStore((s) => s.deleteTransaction)
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState(String(tx.amount))
  const [note, setNote] = useState(tx.note ?? '')
  const [date, setDate] = useState(tx.date)
  const [category, setCategory] = useState<CategoryId>(tx.category)

  const expense = tx.type === 'expense'
  const categories = expense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  const save = () => {
    const value = Number.parseFloat(amount)
    if (!Number.isFinite(value) || value <= 0 || !date) return
    updateTransaction(tx.id, {
      amount: Math.round(value * 100) / 100,
      note: note.trim() || undefined,
      date,
      category,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-cyan/25 bg-navyLight/60 p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Amount"
            className="rounded-lg border border-white/[0.08] bg-navy px-2.5 py-1.5 font-display text-sm tnum text-light"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Date"
            className="rounded-lg border border-white/[0.08] bg-navy px-2.5 py-1.5 font-display text-sm tnum text-light"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryId)}
            aria-label="Category"
            className="rounded-lg border border-white/[0.08] bg-navy px-2.5 py-1.5 text-sm text-light"
          >
            {categories.map((c) => (
              <option key={c} value={c} className="bg-navyLight">
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional detail"
            aria-label="Note"
            className="rounded-lg border border-white/[0.08] bg-navy px-2.5 py-1.5 text-sm text-light placeholder:text-dim/60"
          />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:text-light"
          >
            <X size={13} />
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="inline-flex items-center gap-1 rounded-lg bg-cyan px-3 py-1.5 text-xs font-semibold text-navy"
          >
            <Check size={13} />
            Save
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.03]">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
          expense
            ? 'border-crimson/25 bg-crimson/10 text-crimson'
            : 'border-emerald/25 bg-emerald/10 text-emerald'
        }`}
      >
        {expense ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-light">
          {tx.note ?? CATEGORY_LABEL[tx.category]}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-[11px] text-dim">
          <span className="rounded-full border border-white/[0.08] px-1.5 py-px">
            {CATEGORY_LABEL[tx.category]}
          </span>
          {fmtDayShort(tx.date)}
        </p>
      </div>
      <span
        className={`font-display text-sm font-semibold tnum ${
          expense ? 'text-crimson' : 'text-emerald'
        }`}
      >
        {expense ? '−' : '+'}
        {fmtUsd2(tx.amount)}
      </span>
      <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => {
            setAmount(String(tx.amount))
            setNote(tx.note ?? '')
            setDate(tx.date)
            setCategory(tx.category)
            setEditing(true)
          }}
          aria-label={`Edit ${tx.note ?? CATEGORY_LABEL[tx.category]}`}
          className="rounded-md p-1.5 text-dim transition-colors hover:bg-white/[0.06] hover:text-cyan"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={() => deleteTransaction(tx.id)}
          aria-label={`Delete ${tx.note ?? CATEGORY_LABEL[tx.category]}`}
          className="rounded-md p-1.5 text-dim transition-colors hover:bg-white/[0.06] hover:text-crimson"
        >
          <Trash2 size={13} />
        </button>
      </span>
    </li>
  )
}

function TransactionsCard() {
  const transactions = usePlannerStore((s) => s.transactions)
  const [filter, setFilter] = useState<TxFilter>('all')
  const filtered =
    filter === 'all' ? transactions : transactions.filter((t) => t.type === filter)

  return (
    <Section
      eyebrow="Transactions"
      caption="Edit or delete any entry — balances update live"
      aside={
        <div className="flex rounded-xl border border-white/[0.08] p-0.5">
          {(['all', 'income', 'expense'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f ? 'bg-cyan/15 text-cyan' : 'text-dim hover:text-light'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      }
    >
      <div className="card-chrome p-2 sm:p-3">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-dim">
            No transactions yet. Add income or an expense to get started.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {filtered.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* OverviewCommand — the assembled Overview tab                        */
/* ------------------------------------------------------------------ */

export default function OverviewCommand({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: SignalTab) => void
}) {
  const planner = usePlannerScore()
  const [receiptToken, setReceiptToken] = useState<string | null>(null)

  const onIssueReceipt = () => {
    if (!planner) return
    const receipt = issueReceipt({
      score: planner.score,
      verdict: planner.verdict,
    })
    setReceiptToken(receipt.token)
    downloadReceipt(receipt)
  }

  return (
    <div>
      <SuggestedMove onNavigateTab={onNavigateTab} />
      <PathStrip onNavigateTab={onNavigateTab} />
      <CashPathAndActions onNavigateTab={onNavigateTab} />
      <StartHonest onNavigateTab={onNavigateTab} />
      <DailyCheckin />
      <ExportPack receiptToken={receiptToken} onIssueReceipt={onIssueReceipt} />
      <FinancialReality />
      <SpendDigestSection
        receiptToken={receiptToken}
        onIssueReceipt={onIssueReceipt}
      />
      <div className="mt-10 grid items-start gap-4 lg:grid-cols-2">
        <AddTransactionCard />
        <SavingsGoalCard />
      </div>
      <SpendingDonut />
      <TransactionsCard />
    </div>
  )
}
