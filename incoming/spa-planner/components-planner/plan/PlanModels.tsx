import { useMemo, useState } from 'react'
import { Dices } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { runMonteCarlo } from '@/lib/tools/montecarlo'
import { runScenarioStudio, SCENARIO_DISCLAIMER } from '@/lib/rehearsal'
import type { SimulationInputs } from '@/lib/rehearsal'
import { financialReality } from '@/lib/planner/derived'
import { scoreFromBudget } from '@/lib/planner/score-bridge'
import { formatCurrency, formatPercent } from '@/lib/tools/format'
import { usePlannerStore } from '@/store/planner'
import { TEMP_HEX } from '@/store/budget'
import ChartTooltip from '@/components/ChartTooltip'
import { NumberField } from '@/components/tools/ui'
import { PlanFooter, PlanSectionHeader, PlanTile } from './ui'

/* ------------------------------------------------------------------ */
/* Models sub-tab — Monte Carlo + decision rehearsal (spec §7).        */
/*                                                                     */
/* Monte Carlo: canon lib/tools/montecarlo.ts — 10,000 runs (canon     */
/* default; the reference's 2,500-run drift was rejected), seeded and  */
/* reproducible, with the canon shock params (job loss / maintenance   */
/* / income growth) exposed as labeled assumptions. Return and         */
/* volatility are user-set assumptions — never silently imputed.       */
/*                                                                     */
/* Rehearsal: canon lib/rehearsal.ts buy-now vs wait-12 vs wait-24     */
/* net position at month 60. Home inputs come from the readiness       */
/* profile; monthly savings from live cash flow; appreciation / rent   */
/* increase are the canon defaults — labeled.                          */
/* ------------------------------------------------------------------ */

const MC_RUNS = 10000

const CYAN = '#22d3ee' // brand token value (not a gated verdict color)

export default function PlanModels() {
  const transactions = usePlannerStore((s) => s.transactions)
  const accounts = usePlannerStore((s) => s.accounts)
  const bills = usePlannerStore((s) => s.bills)
  const holdings = usePlannerStore((s) => s.holdings)
  const netWorthItems = usePlannerStore((s) => s.netWorthItems)
  const savingsGoal = usePlannerStore((s) => s.savingsGoal)
  const readinessProfile = usePlannerStore((s) => s.readinessProfile)
  const debts = usePlannerStore((s) => s.debts)

  const finance = useMemo(
    () => financialReality(transactions, accounts, bills),
    [transactions, accounts, bills],
  )

  /* ---- Monte Carlo assumptions (user-editable, seeded from the ledger) ---- */
  const [mcSavings, setMcSavings] = useState(() => Math.round(finance.liquidCash))
  const [mcContribution, setMcContribution] = useState(() =>
    Math.max(0, Math.round(finance.cashFlow)),
  )
  const [mcYears, setMcYears] = useState(5)
  const [mcReturn, setMcReturn] = useState(7)
  const [mcVolatility, setMcVolatility] = useState(12)
  const [mcTarget, setMcTarget] = useState(() => savingsGoal.target)
  const [mcJobLoss, setMcJobLoss] = useState(5)
  const [mcShock, setMcShock] = useState(10)
  const [mcIncomeGrowth, setMcIncomeGrowth] = useState(2)
  const [seed, setSeed] = useState(42)

  const mc = useMemo(
    () =>
      runMonteCarlo({
        currentSavings: Math.max(0, mcSavings),
        monthlyContribution: Math.max(0, mcContribution),
        years: Math.min(30, Math.max(1, mcYears)),
        expectedReturnPct: mcReturn,
        volatilityPct: mcVolatility,
        targetAmount: mcTarget > 0 ? mcTarget : undefined,
        seed,
        runs: MC_RUNS,
        jobLossProb: Math.max(0, mcJobLoss),
        maintenanceShock: Math.max(0, mcShock),
        incomeGrowth: Math.max(0, mcIncomeGrowth),
        monthlyExpenses: finance.expenses > 0 ? finance.expenses : undefined,
      }),
    [
      mcSavings,
      mcContribution,
      mcYears,
      mcReturn,
      mcVolatility,
      mcTarget,
      seed,
      mcJobLoss,
      mcShock,
      mcIncomeGrowth,
      finance.expenses,
    ],
  )

  /* ---- Decision rehearsal ---- */
  const rehearsalInputs: SimulationInputs = useMemo(
    () => ({
      homePrice: readinessProfile.targetHomePrice || 400000,
      downPaymentSaved: readinessProfile.downPaymentSaved || 0,
      monthlySavings: Math.max(0, Math.round(finance.cashFlow)),
      rent: readinessProfile.currentRent || 0,
      rate: readinessProfile.assumedRatePct,
      appreciation: 3.5,
      rentIncrease: 4,
    }),
    [readinessProfile, finance.cashFlow],
  )

  const studio = useMemo(() => {
    const result = scoreFromBudget({
      transactions,
      accounts,
      bills,
      holdings,
      netWorthItems,
      savingsGoal,
      readinessProfile,
      debts,
    })
    return runScenarioStudio({
      ...rehearsalInputs,
      readinessVerdict: result.verdict,
      readinessScore: result.score,
    })
  }, [
    rehearsalInputs,
    transactions,
    accounts,
    bills,
    holdings,
    netWorthItems,
    savingsGoal,
    readinessProfile,
    debts,
  ])

  const rehearsalChart = useMemo(() => {
    const [buyNow, wait12, wait24] = studio.scenarios
    const rows: Array<{
      month: number
      buyNow: number
      wait12: number
      wait24: number
    }> = []
    for (let m = 0; m <= 60; m += 3) {
      rows.push({
        month: m,
        buyNow: buyNow?.series[m]?.netPosition ?? 0,
        wait12: wait12?.series[m]?.netPosition ?? 0,
        wait24: wait24?.series[m]?.netPosition ?? 0,
      })
    }
    return rows
  }, [studio])

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Monte Carlo ---- */}
      <section className="card-chrome card-hairline-top p-5 sm:p-6">
        <PlanSectionHeader
          eyebrow="MONTE CARLO"
          title="Savings trajectory bands"
          caption={`${MC_RUNS.toLocaleString('en-US')} seeded runs — reproducible, never a forecast. Bands are P10 / P50 / P90 of simulated outcomes.`}
          right={
            <button
              type="button"
              onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}
              className="flex items-center gap-1.5 rounded-xl border border-cyan/30 px-3 py-1.5 text-[12px] font-semibold text-cyan transition-colors hover:bg-cyan/[0.08]"
            >
              <Dices size={13} />
              Re-roll seed
            </button>
          }
        />

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <PlanTile label="P10 · FINAL" value={formatCurrency(mc.finalP10)} />
          <PlanTile label="P50 · FINAL" value={formatCurrency(mc.finalP50)} tone="cyan" />
          <PlanTile label="P90 · FINAL" value={formatCurrency(mc.finalP90)} />
          {mc.probabilityOfTarget != null && (
            <PlanTile
              label="P(TARGET)"
              value={formatPercent(mc.probabilityOfTarget, 0)}
              tone="emerald"
              hint={`Reaching ${formatCurrency(mcTarget)} by year ${Math.min(30, Math.max(1, mcYears))}`}
            />
          )}
          <PlanTile
            label="SURVIVAL"
            value={formatPercent(mc.survivalRate, 0)}
            hint="Runs that never hit $0"
          />
          <PlanTile
            label="DISTRESS"
            value={formatPercent(mc.distressRate, 0)}
            tone={mc.distressRate > 25 ? 'amber' : 'default'}
            hint="Runs below one month of expenses"
          />
        </div>

        <div className="mt-5 h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mc.bands} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(y: number) => `Y${y}`}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                width={46}
              />
              <Tooltip
                content={<ChartTooltip format={(n) => formatCurrency(n)} />}
                cursor={{ stroke: 'rgba(255,255,255,0.12)' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="p90" stroke={CYAN} strokeWidth={1.5} dot={false} name="P90" />
              <Line type="monotone" dataKey="p50" stroke={TEMP_HEX.emerald} strokeWidth={2} dot={false} name="P50" />
              <Line type="monotone" dataKey="p10" stroke={TEMP_HEX.amber} strokeWidth={1.5} dot={false} name="P10" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <NumberField label="CURRENT SAVINGS" prefix="$" value={mcSavings} onChange={setMcSavings} step={500} min={0} />
          <NumberField label="MONTHLY CONTRIBUTION" prefix="$" value={mcContribution} onChange={setMcContribution} step={50} min={0} />
          <NumberField label="YEARS" suffix="yr" value={mcYears} onChange={setMcYears} step={1} min={1} />
          <NumberField label="TARGET (0 = NONE)" prefix="$" value={mcTarget} onChange={setMcTarget} step={1000} min={0} />
          <NumberField label="EXPECTED RETURN % / YR" suffix="%" value={mcReturn} onChange={setMcReturn} step={0.5} min={0} />
          <NumberField label="VOLATILITY % / YR" suffix="%" value={mcVolatility} onChange={setMcVolatility} step={1} min={0} />
          <NumberField label="JOB-LOSS PROB % / YR" suffix="%" value={mcJobLoss} onChange={setMcJobLoss} step={1} min={0} />
          <NumberField label="SHOCK PROB % / YR" suffix="%" value={mcShock} onChange={setMcShock} step={1} min={0} />
          <NumberField label="INCOME GROWTH % / YR" suffix="%" value={mcIncomeGrowth} onChange={setMcIncomeGrowth} step={0.5} min={0} />
        </div>

        <PlanFooter
          lines={[
            'Savings and contribution pre-fill from your live ledger. Return, volatility, and shock rates are assumptions you set — edit them to stress the model.',
            `${MC_RUNS.toLocaleString('en-US')} runs · seed ${seed}. Educational simulation only — not a projection of your actual returns.`,
          ]}
        />
      </section>

      {/* ---- Decision rehearsal ---- */}
      <section className="card-chrome card-hairline-top p-5 sm:p-6">
        <PlanSectionHeader
          eyebrow="DECISION REHEARSAL"
          title="Buy now vs waiting"
          caption="Net position at month 60 — equity minus closing, maintenance, and rent paid while waiting."
        />

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {studio.scenarios.map((s) => (
            <PlanTile
              key={s.key}
              label={s.label.toUpperCase()}
              value={`${s.netPositionAt60 < 0 ? '-' : '+'}${formatCurrency(Math.abs(s.netPositionAt60))}`}
              tone={s.netPositionAt60 >= 0 ? 'emerald' : 'crimson'}
              hint={s.key === studio.bestKey ? 'Best net position in this model' : undefined}
            />
          ))}
        </div>

        <p className="mt-4 text-[13px] text-dim">
          Best at month 60:{' '}
          <span className="font-semibold text-light">{studio.bestLabel}</span>
          {' · '}spread{' '}
          <span className="font-display font-semibold text-light">
            {formatCurrency(studio.spreadAt60)}
          </span>
        </p>

        <div className="mt-5 h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rehearsalChart} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(m: number) => `M${m}`}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                width={52}
              />
              <Tooltip
                content={<ChartTooltip format={(n) => formatCurrency(n)} />}
                cursor={{ stroke: 'rgba(255,255,255,0.12)' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="buyNow" stroke={TEMP_HEX.emerald} strokeWidth={2} dot={false} name="Buy the home" />
              <Line type="monotone" dataKey="wait12" stroke={CYAN} strokeWidth={2} dot={false} name="Wait 12 months" />
              <Line type="monotone" dataKey="wait24" stroke={TEMP_HEX.amber} strokeWidth={2} dot={false} name="Wait 24 months" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-4 rounded-xl border border-cyan/20 bg-cyan/[0.05] px-3.5 py-2.5 text-[12px] leading-relaxed text-light/90">
          {studio.readinessNote}
        </p>

        <PlanFooter
          lines={[
            `Inputs: ${formatCurrency(rehearsalInputs.homePrice)} home · ${formatCurrency(rehearsalInputs.downPaymentSaved)} down · ${rehearsalInputs.rate}% rate · ${formatCurrency(rehearsalInputs.rent)} rent · ${formatCurrency(rehearsalInputs.monthlySavings)}/mo savings (live cash flow). Assumptions: 3.5%/yr appreciation, 4%/yr rent increase, 3% closing, 1%/yr maintenance.`,
            SCENARIO_DISCLAIMER,
          ]}
        />
      </section>
    </div>
  )
}
