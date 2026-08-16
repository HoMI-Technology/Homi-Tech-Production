import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { liquidSavings, monthExpenses, monthIncome, useBudget, fmt } from '@/store/budget'
import { useAssessmentInputs, useAssessmentResult, useBudgetDerived } from '@/store/readiness'
import {
  loadRehearsalInputs,
  runScenarioStudio,
  saveRehearsalInputs,
  scenarioDefaultsFromBudget,
  type SimulationInputs,
} from '@/lib/rehearsal'
import { deriveAnchors, rankLeverScenarios, seedBaseline, simulate, ESTIMATED_DEBT_PAYMENT_RATE } from '@/lib/scoreSimulator'
import RehearsalInputs from '@/components/rehearse/RehearsalInputs'
import ScenarioCards from '@/components/rehearse/ScenarioCards'
import NetPositionChart from '@/components/rehearse/NetPositionChart'
import MoneyLevers from '@/components/rehearse/MoneyLevers'
import FeedsCard from '@/components/rehearse/FeedsCard'

const reveal = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.06, ease: 'easeOut' as const },
})

/**
 * Decision Rehearsal — /rehearse.
 * Buy-now vs wait-12 vs wait-24 net-position simulation (canonical engine
 * port) plus the money-lever ranking (canonical score simulator port).
 * Educational scenarios only — never advice.
 */
export default function Rehearse() {
  const { state } = useBudget()
  const { houseGoal } = useBudgetDerived()
  const assessmentInputs = useAssessmentInputs()
  const assessmentResult = useAssessmentResult()

  /* ---- rehearsal inputs: ledger-derived defaults merged with persisted edits ---- */
  const defaults = useMemo(() => scenarioDefaultsFromBudget(state, houseGoal), [state, houseGoal])
  const [inputs, setInputs] = useState<SimulationInputs>(() => loadRehearsalInputs(defaults))

  const onChange = (next: SimulationInputs) => {
    setInputs(next)
    saveRehearsalInputs(next)
  }

  /* ---- buy vs wait: canonical scenario studio ---- */
  const studio = useMemo(
    () =>
      runScenarioStudio({
        ...inputs,
        readinessVerdict: assessmentResult.verdict,
        readinessScore: assessmentResult.score,
      }),
    [inputs, assessmentResult],
  )

  /* ---- money levers: canonical score simulator over the live ledger ---- */
  const baseline = useMemo(
    () =>
      seedBaseline({
        monthlyIncome: monthIncome(state, 0),
        monthlyExpenses: monthExpenses(state, 0),
        liquidSavings: liquidSavings(state),
        totalDebt: state.totalDebt,
        monthlyDebtPayments: state.monthlyDebtPayments,
      }),
    [state],
  )
  const anchors = useMemo(() => deriveAnchors(assessmentInputs), [assessmentInputs])
  const leverScenarios = useMemo(() => rankLeverScenarios(baseline, anchors), [baseline, anchors])
  const baseOutcome = useMemo(() => simulate(baseline, baseline, anchors), [baseline, anchors])

  const waitingWins = studio.bestKey !== 'buy-now'

  return (
    <div className="flex flex-col gap-10">
      {/* ============================== HERO ============================== */}
      <motion.header {...reveal(0)}>
        <p className="text-label">Decision Rehearsal</p>
        <h1 className="mt-3 font-serif text-3xl italic leading-snug text-light md:text-4xl">
          Practice the decision before you live it.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">
          Three honest scenarios from your own ledger — buy now, wait a year, wait two. These are
          scenarios, not predictions.
        </p>
      </motion.header>

      {/* ===================== BUY NOW VS WAIT ===================== */}
      <motion.section {...reveal(1)} className="flex flex-col gap-4">
        <div>
          <h2 className="text-h2">Buy now vs wait</h2>
          <p className="mt-1 text-xs text-dim">
            Pre-filled from your ledger — every number is editable and stays put when you come back.
          </p>
        </div>

        <div className="card-chrome p-5">
          <RehearsalInputs inputs={inputs} onChange={onChange} />
        </div>

        <ScenarioCards scenarios={studio.scenarios} bestKey={studio.bestKey} />

        <div className="card-chrome p-5">
          <NetPositionChart scenarios={studio.scenarios} />
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="text-sm leading-relaxed text-light">
              In this model, <span className="font-semibold">{studio.bestLabel.toLowerCase()}</span>{' '}
              leaves you strongest at month 60
              {studio.spreadAt60 > 0 && (
                <>
                  {' '}
                  — <span className="text-data-sm text-emerald">{fmt(studio.spreadAt60)}</span> ahead of
                  the weakest path
                </>
              )}
              .
            </p>
            <p className="mt-2 text-xs leading-relaxed text-dim">{studio.readinessNote}</p>
            <p className="mt-1 text-xs leading-relaxed text-dim/80">{studio.disclaimer}</p>
          </div>
        </div>
      </motion.section>

      {/* ===================== MONEY LEVERS ===================== */}
      <motion.section {...reveal(2)} className="flex flex-col gap-4">
        <div>
          <h2 className="text-h2">Money levers</h2>
          <p className="mt-1 text-xs text-dim">
            Ranked by what each move does to your readiness score on its own.
          </p>
        </div>
        <div className="card-chrome p-5">
          <MoneyLevers scenarios={leverScenarios} />
          <div className="mt-4 border-t border-white/[0.06] pt-3">
            <p className="text-[11px] leading-relaxed text-dim/80">
              Only the Financial Reality pillar is simulated — Emotional Truth and Perfect Timing are
              held at your current assessment.
              {anchors.neutral && ' No assessment found, so neutral placeholder inputs are in play.'}
              {baseOutcome.debtPaymentsEstimated &&
                ` Monthly debt payments are estimated from your balance (${ESTIMATED_DEBT_PAYMENT_RATE * 100}%/mo), not known.`}
            </p>
          </div>
        </div>
      </motion.section>

      {/* ===================== WHAT THIS FEEDS ===================== */}
      <motion.div {...reveal(3)}>
        <FeedsCard waitingWins={waitingWins} />
      </motion.div>

      {/* footer disclaimer strip — verbatim legal block (required on score surfaces) */}
      <motion.div {...reveal(4)}>
        <div className="mx-auto max-w-3xl border-t border-white/[0.06] pt-4 text-center text-xs leading-relaxed text-dim/80">
          <p>
            HōMI is a product of HOMI TECHNOLOGIES LLC. HōMI is not a lender, mortgage broker,
            registered investment advisor, credit bureau, real estate agent or brokerage, financial
            planner, bank or deposit institution, or product recommendation engine. HōMI provides
            educational guidance only and does not provide financial, legal, tax, mortgage, real
            estate, or investment advice.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
