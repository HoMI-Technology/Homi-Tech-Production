/* ------------------------------------------------------------------ */
/* Readiness-score simulator — VERBATIM port of GitHub canon           */
/* simulator.ts, adapted to the local app:                             */
/*                                                                     */
/* Every score here comes from the canonical engine (@/lib/score       */
/* computeScore / deriveVerdict) — this module never reimplements      */
/* thresholds or point tables. It only:                                */
/*                                                                     */
/*   1. Seeds a baseline from the user's own ledger (budget store      */
/*      selectors — the local equivalent of canon's manual Finance     */
/*      dashboard state; this app has no Plaid snapshot tier, so the   */
/*      plaid_sync seed branch is dropped and documented).             */
/*   2. Translates the four money levers (income, expenses, liquid     */
/*      savings, total debt) into the engine's financial-pillar        */
/*      inputs.                                                        */
/*   3. Holds the emotional and timing pillars — plus the financial    */
/*      inputs the levers cannot reach (credit score, down-payment     */
/*      percent) — at the user's latest assessment values (neutral     */
/*      placeholders when no assessment exists; outcomes carry a       */
/*      `neutral` flag so the UI labels it).                           */
/*                                                                     */
/* HONESTY RULES the UI relies on:                                     */
/*   • When actual monthly debt payments are unknown they are          */
/*     ESTIMATED at ESTIMATED_DEBT_PAYMENT_RATE of the balance and     */
/*     every outcome flags `debtPaymentsEstimated` so the UI says so.  */
/*   • Only the financial pillar is simulated; the composite moves     */
/*     solely through it. The UI must state that the other two         */
/*     pillars are held.                                               */
/* ------------------------------------------------------------------ */

import {
  computeScore,
  deriveVerdict,
  type AssessmentInputs,
  type HardStopKey,
  type PillarScore,
  type VerdictKey,
} from '@/lib/score'

// ---------------------------------------------------------------------------
// Levers + baseline
// ---------------------------------------------------------------------------

/** The four money levers the simulator exposes. */
export interface SimulatorLevers {
  monthlyIncome: number
  monthlyExpenses: number
  liquidSavings: number
  totalDebt: number
}

export type BaselineSource = 'manual' | 'empty'

export interface SimulatorBaseline extends SimulatorLevers {
  source: BaselineSource
  /**
   * Actual monthly debt payments when the baseline knows them (the budget
   * ledger tracks them). null → payments are estimated from the balance.
   */
  monthlyDebtPayments: number | null
}

/** Balance share used to estimate monthly debt payments when unknown. */
export const ESTIMATED_DEBT_PAYMENT_RATE = 0.02

/**
 * Seeds the simulator baseline from the ledger: budget-store selectors →
 * zeros ("empty"). (Canon seeds plaid_sync snapshot → manual finance state
 * → zeros; this app has no Plaid tier, so the ledger is the first seed.)
 */
export function seedBaseline(
  financeState: (SimulatorLevers & { monthlyDebtPayments: number | null }) | null,
): SimulatorBaseline {
  if (financeState) {
    return {
      monthlyIncome: financeState.monthlyIncome,
      monthlyExpenses: financeState.monthlyExpenses,
      liquidSavings: financeState.liquidSavings,
      totalDebt: financeState.totalDebt,
      monthlyDebtPayments: financeState.monthlyDebtPayments,
      source: 'manual',
    }
  }
  return {
    monthlyIncome: 0,
    monthlyExpenses: 0,
    liquidSavings: 0,
    totalDebt: 0,
    monthlyDebtPayments: null,
    source: 'empty',
  }
}

// ---------------------------------------------------------------------------
// Anchors — everything the levers do NOT move
// ---------------------------------------------------------------------------

export interface SimulatorAnchors {
  /** Emotional pillar held constant (0-35). */
  emotionalScore: number
  /** Timing pillar held constant (0-30). */
  timingScore: number
  /** Financial inputs the levers cannot derive. */
  creditScore: number
  downPaymentPercent: number
  /** Full stored assessment inputs when available (keeps e.g. the housing-ratio guard honest). */
  inputs: AssessmentInputs | null
  /** True when no completed assessment existed and neutral placeholders are in play. */
  neutral: boolean
}

/**
 * Neutral placeholder inputs used only when the user has no completed
 * assessment: mid-scale sliders, a credit score above every hard-stop line,
 * and the same fill-ins the Shadow Score uses. Purely a stand-in so the
 * composite is computable — the UI labels it.
 */
export const NEUTRAL_INPUTS: AssessmentInputs = {
  debtToIncomeRatio: 0,
  downPaymentPercent: 0.1,
  emergencyFundMonths: 0,
  creditScore: 700,
  lifeStability: 6,
  confidenceLevel: 6,
  partnerAlignment: null,
  fomoLevel: 5,
  timeHorizonMonths: 12,
  savingsRate: 0.1,
  downPaymentProgress: 0.4,
}

/**
 * Builds the held-constant anchors from the user's current assessment
 * inputs, or from NEUTRAL_INPUTS when none exists. (Canon anchors to the
 * stored pillar scores of the latest completed assessment, falling back to
 * a recompute; the local store recomputes live through the same engine, so
 * the recompute IS the anchor — identical numbers, deterministic.)
 */
export function deriveAnchors(inputs: AssessmentInputs | null): SimulatorAnchors {
  if (inputs) {
    const recomputed = computeScore(inputs)
    return {
      emotionalScore: Math.round(recomputed.pillars.emotional.total),
      timingScore: Math.round(recomputed.pillars.timing.total),
      creditScore: inputs.creditScore,
      downPaymentPercent: inputs.downPaymentPercent,
      inputs,
      neutral: false,
    }
  }

  const neutral = computeScore(NEUTRAL_INPUTS)
  return {
    emotionalScore: neutral.pillars.emotional.total,
    timingScore: neutral.pillars.timing.total,
    creditScore: NEUTRAL_INPUTS.creditScore,
    downPaymentPercent: NEUTRAL_INPUTS.downPaymentPercent,
    inputs: null,
    neutral: true,
  }
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export interface SimulationOutcome {
  /** Financial Reality pillar under these levers (0-35). */
  financialScore: number
  financial: PillarScore
  /** Composite = simulated financial + held emotional + held timing (0-100). */
  compositeScore: number
  verdict: VerdictKey
  hardStops: HardStopKey[]
  /** The monthly debt payments the DTI read used. */
  monthlyDebtPayments: number
  /** True when payments were estimated from the balance, not known. */
  debtPaymentsEstimated: boolean
  /** Derived inputs, surfaced so the UI can show its work. */
  derived: {
    debtToIncomeRatio: number
    emergencyFundMonths: number
  }
}

export interface SimulateOptions {
  /**
   * Additional monthly debt service the balance levers cannot derive — e.g.
   * a hypothetical new housing payment a Decision Lab lens is testing
   * (Phase 5). Counted in BOTH the DTI numerator and the outflow, so the
   * engine sees the obligation exactly once.
   */
  extraDebtService?: number
}

/**
 * Monthly debt payments for a lever position. Known baseline payments scale
 * proportionally with the balance ("pay off half the debt, halve the
 * payment"); unknown payments are estimated from the balance and flagged.
 */
export function deriveDebtPayments(
  totalDebt: number,
  baseline: Pick<SimulatorBaseline, 'totalDebt' | 'monthlyDebtPayments'>,
): { amount: number; estimated: boolean } {
  const debt = Math.max(0, totalDebt)
  if (baseline.monthlyDebtPayments !== null && baseline.totalDebt > 0) {
    return { amount: baseline.monthlyDebtPayments * (debt / baseline.totalDebt), estimated: false }
  }
  if (baseline.monthlyDebtPayments !== null && debt === 0) {
    return { amount: 0, estimated: false }
  }
  return { amount: debt * ESTIMATED_DEBT_PAYMENT_RATE, estimated: true }
}

/**
 * Runs the canonical engine for one lever position. Only the financial
 * pillar is taken from the run; emotional and timing come from the anchors.
 */
export function simulate(
  levers: SimulatorLevers,
  baseline: SimulatorBaseline,
  anchors: SimulatorAnchors,
  opts: SimulateOptions = {},
): SimulationOutcome {
  const payments = deriveDebtPayments(levers.totalDebt, baseline)
  const extra = Math.max(0, opts.extraDebtService ?? 0)
  const totalPayments = payments.amount + extra
  const debtToIncomeRatio = levers.monthlyIncome > 0 ? totalPayments / levers.monthlyIncome : 0
  // Runway counts debt payments as outflow, matching the budget store.
  const outflow = Math.max(0, levers.monthlyExpenses) + totalPayments
  const emergencyFundMonths = outflow > 0 ? Math.max(0, levers.liquidSavings) / outflow : 0

  const result = computeScore({
    ...(anchors.inputs ?? NEUTRAL_INPUTS),
    debtToIncomeRatio,
    emergencyFundMonths,
    creditScore: anchors.creditScore,
    downPaymentPercent: anchors.downPaymentPercent,
  })

  const compositeScore = Math.max(
    0,
    Math.min(100, result.pillars.financial.total + anchors.emotionalScore + anchors.timingScore),
  )
  const verdict: VerdictKey = result.hardStops.length > 0 ? 'NOT_YET' : deriveVerdict(compositeScore)

  return {
    financialScore: result.pillars.financial.total,
    financial: result.pillars.financial,
    compositeScore,
    verdict,
    hardStops: result.hardStops,
    monthlyDebtPayments: totalPayments,
    debtPaymentsEstimated: payments.estimated,
    derived: { debtToIncomeRatio, emergencyFundMonths },
  }
}

// ---------------------------------------------------------------------------
// Scenario shortcuts
// ---------------------------------------------------------------------------

/**
 * "Pay off $X of debt" — pays from liquid savings, so it can never pay more
 * than the debt owed or the savings available.
 */
export function applyDebtPayoff(levers: SimulatorLevers, amount: number): SimulatorLevers {
  const paid = Math.max(0, Math.min(amount, levers.totalDebt, levers.liquidSavings))
  return { ...levers, totalDebt: levers.totalDebt - paid, liquidSavings: levers.liquidSavings - paid }
}

/** "Save $Y/mo for N months" — adds the plan's total to liquid savings. */
export function applySavingsPlan(levers: SimulatorLevers, perMonth: number, months: number): SimulatorLevers {
  const added = Math.max(0, perMonth) * Math.max(0, Math.round(months))
  return { ...levers, liquidSavings: levers.liquidSavings + added }
}

// ---------------------------------------------------------------------------
// Lever ranking
// ---------------------------------------------------------------------------

export type LeverKey = keyof SimulatorLevers

export const LEVER_LABELS: Record<LeverKey, string> = {
  monthlyIncome: 'Monthly income',
  monthlyExpenses: 'Monthly expenses',
  liquidSavings: 'Liquid savings',
  totalDebt: 'Total debt',
}

export interface LeverImpact {
  key: LeverKey
  label: string
  /** Composite-score points this lever's change contributes on its own. */
  delta: number
}

/**
 * Ranks the levers the user moved by marginal impact: each changed lever is
 * applied to the baseline ALONE and its composite delta measured, largest
 * absolute effect first. Unchanged levers are omitted.
 */
export function rankLevers(
  levers: SimulatorLevers,
  baseline: SimulatorBaseline,
  anchors: SimulatorAnchors,
): LeverImpact[] {
  const baseComposite = simulate(baseline, baseline, anchors).compositeScore
  const impacts: LeverImpact[] = []
  for (const key of Object.keys(LEVER_LABELS) as LeverKey[]) {
    if (levers[key] === baseline[key]) continue
    const solo = simulate({ ...baseline, [key]: levers[key] }, baseline, anchors)
    impacts.push({ key, label: LEVER_LABELS[key], delta: solo.compositeScore - baseComposite })
  }
  return impacts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

// ---------------------------------------------------------------------------
// Canonical lever moves — one concrete, deterministic move per lever so the
// rehearsal page can rank all four without waiting for slider input. Each
// move runs through rankLevers semantics: applied to the baseline ALONE,
// delta measured against the baseline composite. No-op moves (nothing to
// pay down, no surplus to save) are omitted, same honesty rule as
// rankLevers' "unchanged levers are omitted".
// ---------------------------------------------------------------------------

/** Months in the canonical savings-plan move. */
export const LEVER_SAVINGS_MONTHS = 12
/** Share of monthly expenses the canonical expense cut removes. */
export const LEVER_EXPENSE_CUT_RATE = 0.1
/** Share of monthly income the canonical income move adds. */
export const LEVER_INCOME_RAISE_RATE = 0.1

export interface LeverScenario extends LeverImpact {
  /** "Paying down $5,000 of debt" — the move, in words. */
  description: string
  /** The lever position after the move (for drill-down UI). */
  levers: SimulatorLevers
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

/**
 * Builds + ranks the four canonical lever moves against the baseline:
 *   totalDebt       → pay down as much as savings allow
 *   liquidSavings   → save the current monthly surplus for 12 months
 *   monthlyExpenses → cut 10%
 *   monthlyIncome   → add 10%
 * Largest absolute composite impact first; no-op moves omitted.
 */
export function rankLeverScenarios(
  baseline: SimulatorBaseline,
  anchors: SimulatorAnchors,
): LeverScenario[] {
  const scenarios: { key: LeverKey; description: string; levers: SimulatorLevers }[] = []

  const payoff = Math.max(0, Math.min(baseline.totalDebt, baseline.liquidSavings))
  if (payoff > 0) {
    scenarios.push({
      key: 'totalDebt',
      description: `Paying down ${usd(payoff)} of debt`,
      levers: applyDebtPayoff(baseline, payoff),
    })
  }

  const payments = deriveDebtPayments(baseline.totalDebt, baseline)
  const surplus = Math.max(0, baseline.monthlyIncome - baseline.monthlyExpenses - payments.amount)
  if (surplus > 0) {
    scenarios.push({
      key: 'liquidSavings',
      description: `Saving ${usd(surplus)}/mo for ${LEVER_SAVINGS_MONTHS} months`,
      levers: applySavingsPlan(baseline, surplus, LEVER_SAVINGS_MONTHS),
    })
  }

  const expenseCut = baseline.monthlyExpenses * LEVER_EXPENSE_CUT_RATE
  if (expenseCut > 0) {
    scenarios.push({
      key: 'monthlyExpenses',
      description: `Cutting monthly expenses by ${usd(expenseCut)}`,
      levers: { ...baseline, monthlyExpenses: baseline.monthlyExpenses - expenseCut },
    })
  }

  const incomeRaise = baseline.monthlyIncome * LEVER_INCOME_RAISE_RATE
  if (incomeRaise > 0) {
    scenarios.push({
      key: 'monthlyIncome',
      description: `Earning ${usd(incomeRaise)} more each month`,
      levers: { ...baseline, monthlyIncome: baseline.monthlyIncome + incomeRaise },
    })
  }

  const baseComposite = simulate(baseline, baseline, anchors).compositeScore
  return scenarios
    .map((s) => ({
      key: s.key,
      label: LEVER_LABELS[s.key],
      description: s.description,
      levers: s.levers,
      delta: simulate(s.levers, baseline, anchors).compositeScore - baseComposite,
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}
