import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  fmt,
  fmtPct,
  liquidSavings,
  monthExpenses,
  monthIncome,
  runwayMonths,
  runwayTemperature,
  savingsTemperature,
  useBudget,
} from '@/store/budget'
import type { Temperature } from '@/store/budget'
import { TEMP_HEX } from '@/store/budget'
import { detectHardStops } from '@/lib/score'
import { useAssessmentInputs, useBudgetDerived } from '@/store/readiness'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Section 4 — Shock resilience (M2). Three scenarios recomputed live   */
/* from the budget store. Each answers "what breaks first?" — they are  */
/* scenarios, not predictions.                                          */
/* ------------------------------------------------------------------ */

type Severity = 'ok' | 'tight' | 'break'

const SEVERITY_BORDER: Record<Severity, string> = {
  ok: TEMP_HEX.emerald,
  tight: TEMP_HEX.yellow,
  break: TEMP_HEX.crimson,
}

const SEVERITY_TEXT: Record<Severity, string> = {
  ok: 'text-emerald',
  tight: 'text-yellow',
  break: 'text-crimson',
}

const TEMP_RANK: Record<Temperature, number> = { emerald: 0, yellow: 1, amber: 2, crimson: 3 }

function worstTemp(a: Temperature, b: Temperature): Temperature {
  return TEMP_RANK[a] >= TEMP_RANK[b] ? a : b
}

function severityOf(temp: Temperature): Severity {
  if (temp === 'crimson') return 'break'
  if (temp === 'emerald') return 'ok'
  return 'tight'
}

/** Illustrative fixed rate for the +2% scenario (education only, not a quote). */
const BASE_LOAN_RATE = 0.06
const RATE_SHOCK = 0.02
const LOAN_MONTHS = 360
const EXPENSE_SHOCK = 1000

function mortgagePayment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0) return 0
  const r = annualRate / 12
  if (r <= 0) return principal / months
  const f = Math.pow(1 + r, months)
  return (principal * r * f) / (f - 1)
}

type ShockCard = {
  key: string
  label: string
  value: string
  consequence: string
  severity: Severity
}

export default function ShockCards() {
  const { state } = useBudget()
  const derived = useBudgetDerived()
  const inputs = useAssessmentInputs()

  const cards = useMemo<ShockCard[]>(() => {
    const income = monthIncome(state, 0)
    const expenses = monthExpenses(state, 0)
    const liquid = liquidSavings(state)

    /* ---- income shock: income → 0 ------------------------------------ */
    const runwayRaw = runwayMonths(state)
    const runway = Number.isFinite(runwayRaw) ? runwayRaw : 99
    const incomeTemp = runwayTemperature(runway)
    const incomeCard: ShockCard = {
      key: 'income',
      label: 'Income shock',
      value: `${runway.toFixed(1)} mo`,
      consequence:
        runway < 1
          ? `If income stopped tomorrow: ${runway.toFixed(1)} months of runway — the under-one-month hard-stop trips.`
          : `If income stopped tomorrow: ${runway.toFixed(1)} months of runway before the well runs dry.`,
      severity: severityOf(incomeTemp),
    }

    /* ---- rate shock: housing cost +2% on a 30y loan ------------------- */
    const proxyLoan = derived.hasHouseGoal
      ? derived.houseGoal!.target / 0.2
      : 3 * income * 12
    const newPayment = mortgagePayment(proxyLoan, BASE_LOAN_RATE + RATE_SHOCK, LOAN_MONTHS)
    const ratio = income > 0 ? newPayment / income : Number.POSITIVE_INFINITY
    const crosses = detectHardStops({ ...inputs, monthlyHousingRatio: ratio }).includes(
      'HOUSING_RATIO_OVER_45',
    )
    const rateCard: ShockCard =
      income > 0
        ? {
            key: 'rate',
            label: 'Rate shock · +2%',
            value: fmtPct(ratio),
            consequence: `About ${fmt(newPayment)}/mo on an illustrative 30-year loan of ${fmt(proxyLoan)} — housing takes ${fmtPct(ratio)} of income, ${crosses ? 'over' : 'still under'} the 45% line.`,
            severity: crosses ? 'break' : ratio <= 0.28 ? 'ok' : 'tight',
          }
        : {
            key: 'rate',
            label: 'Rate shock · +2%',
            value: '—',
            consequence: 'Log income this month to run the +2% scenario against your numbers.',
            severity: 'tight',
          }

    /* ---- expense shock: +$1,000/mo expenses --------------------------- */
    const shockedRate = income > 0 ? (income - (expenses + EXPENSE_SHOCK) - state.monthlyDebtPayments) / income : 0
    const shockedOutflow = expenses + EXPENSE_SHOCK + state.monthlyDebtPayments
    const shockedRunway = shockedOutflow > 0 ? liquid / shockedOutflow : 99
    const expenseTemp = worstTemp(savingsTemperature(shockedRate), runwayTemperature(shockedRunway))
    const expenseCard: ShockCard = {
      key: 'expense',
      label: 'Expense shock · +$1,000',
      value: fmtPct(shockedRate),
      consequence:
        shockedRunway < 1
          ? `Savings rate becomes ${fmtPct(shockedRate)} and runway drops under one month — the hard-stop trips.`
          : `Savings rate becomes ${fmtPct(shockedRate)} and runway ${shockedRunway.toFixed(1)} months.`,
      severity: severityOf(expenseTemp),
    }

    return [incomeCard, rateCard, expenseCard]
  }, [state, derived, inputs])

  return (
    <section id="shocks" aria-label="Shock resilience" className="scroll-mt-24">
      <h2 className="text-label">Shock resilience</h2>
      <p className="mt-2 text-xs leading-relaxed text-dim">
        Three scenarios, recomputed live from your ledger. Each answers one question: what breaks
        first?
      </p>

      <div className="mt-4 grid grid-cols-12 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.3, delay: i * 0.06, ease: 'easeOut' }}
            className="card-chrome col-span-12 border-l-2 p-5 md:col-span-4"
            style={{ borderLeftColor: SEVERITY_BORDER[card.severity] }}
          >
            <p className="font-display text-[11px] font-medium uppercase tracking-[0.12em] text-dim">
              {card.label}
            </p>
            <p className={cn('mt-3 font-display text-3xl font-semibold tnum', SEVERITY_TEXT[card.severity])}>
              {card.value}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-dim">{card.consequence}</p>
          </motion.div>
        ))}
      </div>

      <p className="mt-3 font-serif text-[13px] italic text-dim">
        Shocks are scenarios, not predictions. The point is knowing your margin.
      </p>
    </section>
  )
}
