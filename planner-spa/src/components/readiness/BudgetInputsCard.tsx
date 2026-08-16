import { Link } from 'react-router-dom'
import { Home, PiggyBank, Scale, TrendingUp } from 'lucide-react'
import PulseDot from '@/components/PulseDot'
import type { ScoreResult } from '@/lib/score'
import { fmtPct } from '@/store/budget'
import { useBudgetDerived } from '@/store/readiness'

type Row = {
  key: string
  icon: typeof Scale
  label: string
  source: string
  value: string
  pts: number
  max: number
}

/**
 * "From your budget" card — the four engine inputs derived live from the
 * ledger, with the points each one currently earns (design/readiness.md §5).
 */
export default function BudgetInputsCard({ result }: { result: ScoreResult }) {
  const derived = useBudgetDerived()

  const fin = result.pillars.financial.factors
  const tim = result.pillars.timing.factors
  const dtiPts = fin.find((f) => f.key === 'dti')!
  const efPts = fin.find((f) => f.key === 'emergencyFund')!
  const srPts = tim.find((f) => f.key === 'savingsRate')!
  const dpPts = tim.find((f) => f.key === 'downPaymentProgress')!

  const rows: Row[] = [
    {
      key: 'dti',
      icon: Scale,
      label: 'Debt-to-income',
      source: 'Monthly debt payments ÷ this month’s income',
      value: fmtPct(derived.debtToIncomeRatio),
      pts: dtiPts.pts,
      max: dtiPts.max,
    },
    {
      key: 'savings',
      icon: TrendingUp,
      label: 'Savings rate',
      source: 'Net cash flow ÷ income',
      value: fmtPct(derived.savingsRate),
      pts: srPts.pts,
      max: srPts.max,
    },
    {
      key: 'runway',
      icon: PiggyBank,
      label: 'Emergency runway',
      source: 'Liquid savings ÷ monthly outflow',
      value: `${derived.emergencyFundMonths.toFixed(1)} mo`,
      pts: efPts.pts,
      max: efPts.max,
    },
    {
      key: 'progress',
      icon: Home,
      label: 'Down-payment progress',
      source: derived.hasHouseGoal
        ? `${derived.houseGoal!.name} — saved ÷ target`
        : 'No down-payment goal found',
      value: derived.hasHouseGoal ? fmtPct(derived.downPaymentProgress) : '—',
      pts: dpPts.pts,
      max: dpPts.max,
    },
  ]

  return (
    <div className="card-chrome border-l-2 border-l-cyan/70 p-5">
      <div className="flex items-center justify-between">
        <span className="text-label">From your budget</span>
        <span className="flex items-center gap-1.5 rounded-full bg-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
          <PulseDot color="#22d3ee" size={5} />
          Live
        </span>
      </div>

      <div className="mt-4 flex flex-col">
        {rows.map((row, i) => {
          const Icon = row.icon
          return (
            <div
              key={row.key}
              className={i > 0 ? 'flex items-center gap-3 border-t border-white/[0.06] py-3.5' : 'flex items-center gap-3 pb-3.5'}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-cyan-300">
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-light">{row.label}</p>
                <p className="mt-0.5 truncate text-[11px] text-dim">{row.source}</p>
                {row.key === 'progress' && !derived.hasHouseGoal && (
                  <Link to="/goals" className="mt-0.5 block text-[11px] font-semibold text-cyan-300 hover:text-cyan-200">
                    Set a down-payment goal
                  </Link>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-data-sm text-light">{row.value}</p>
                <p className="mt-0.5 text-[11px] text-dim">
                  {row.pts} / {row.max} pts
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-2 border-t border-white/[0.06] pt-3 text-[11px] text-dim">
        These update themselves as you log transactions.
      </p>
    </div>
  )
}
