/* ------------------------------------------------------------------ */
/* Decision Rehearsal — VERBATIM port of GitHub canon:                 */
/*   lib/decisions/simulate.ts  (pure buy-now vs wait simulation)      */
/*   lib/decisions/state.ts     (local-first input persistence)        */
/*   lib/readiness/scenario.ts  (readiness-aware scenario studio)      */
/*   lib/readiness/scenario-path.ts (path from scenario)               */
/* Math and copy preserved exactly. Adaptations:                       */
/*   • verdict/hard-stop types come from @/lib/score (VerdictKey,      */
/*     HardStopKey, ScoreResult) instead of canon's scoring engine.    */
/*   • scenario-path hard-stop check reads our string HardStopKey[]    */
/*     instead of canon objects with a `.code` field.                  */
/*   • persistence key is homi-rehearsal-v1 (local app convention);    */
/*     loadRehearsalInputs merges saved fields over caller-supplied    */
/*     defaults (ledger-derived), same merge-over-defaults pattern.    */
/*   • scenarioDefaultsFromBudget() replaces canon's finance-store     */
/*     pull with our budget-store selectors.                           */
/* Pure module, deterministic — no side effects except the explicitly  */
/* window-guarded localStorage load/save. Educational modeling only    */
/* — not financial advice.                                             */
/* ------------------------------------------------------------------ */

import type { HardStopKey, ScoreResult, VerdictKey } from '@/lib/score'
import type { BudgetState, Goal } from '@/store/budget'
import { liquidSavings, monthExpenses, monthIncome, transactionsInMonth } from '@/store/budget'

/* ================================================================== */
/* lib/decisions/simulate.ts — verbatim                               */
/* ================================================================== */

export interface SimulationInputs {
  /** Current home price, dollars. */
  homePrice: number
  /** Down payment already saved, dollars. */
  downPaymentSaved: number
  /** Additional monthly savings capacity, dollars/month. */
  monthlySavings: number
  /** Current monthly rent, dollars. */
  rent: number
  /** Expected mortgage interest rate, percent (e.g. 6.5). */
  rate: number
  /** Expected annual home price appreciation, percent (e.g. 3.5). */
  appreciation: number
  /** Expected annual rent increase, percent (e.g. 4). */
  rentIncrease: number
}

export type ScenarioKey = 'buy-now' | 'wait-12' | 'wait-24'

export interface MonthPoint {
  month: number
  netPosition: number
}

export interface ScenarioOutcome {
  key: ScenarioKey
  label: string
  /** Net position (equity - remaining costs, or savings net of rent) at month 60 from today. */
  netPositionAt60: number
  /** Month-by-month net position from today (month 0) through month 60. */
  series: MonthPoint[]
}

const LOAN_TERM_MONTHS = 360 // 30-year mortgage, standard assumption for amortization.
const CLOSING_COST_RATE = 0.03 // Simplified closing costs as % of home price.
const MAINTENANCE_RATE_ANNUAL = 0.01 // Simplified annual maintenance as % of home value.

/** Monthly amortizing payment for a fixed-rate loan. */
function monthlyPayment(principal: number, annualRatePct: number, termMonths: number): number {
  const r = annualRatePct / 100 / 12
  if (r === 0) return principal / termMonths
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths))
}

/** Remaining loan balance after `monthsElapsed` payments. */
function remainingBalance(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  monthsElapsed: number,
): number {
  const r = annualRatePct / 100 / 12
  if (r === 0) return Math.max(principal - (principal / termMonths) * monthsElapsed, 0)
  const payment = monthlyPayment(principal, annualRatePct, termMonths)
  const balance =
    principal * Math.pow(1 + r, monthsElapsed) - payment * ((Math.pow(1 + r, monthsElapsed) - 1) / r)
  return Math.max(balance, 0)
}

/**
 * Simulates buying now: tracks home value growth (monthly-compounded
 * appreciation) minus remaining loan balance (equity), minus cumulative
 * ownership costs (maintenance) already paid out of pocket, minus the
 * upfront closing costs. Down payment capital is treated as already spent
 * (it becomes home equity, not idle savings).
 */
function simulateBuyNow(inputs: SimulationInputs, months: number): MonthPoint[] {
  const { homePrice, downPaymentSaved, rate, appreciation } = inputs
  const closingCosts = homePrice * CLOSING_COST_RATE
  const loanPrincipal = Math.max(homePrice - downPaymentSaved, 0)
  const monthlyAppreciation = appreciation / 100 / 12
  const monthlyMaintenance = (homePrice * MAINTENANCE_RATE_ANNUAL) / 12

  const series: MonthPoint[] = []
  for (let m = 0; m <= months; m++) {
    const homeValue = homePrice * Math.pow(1 + monthlyAppreciation, m)
    const balance = remainingBalance(loanPrincipal, rate, LOAN_TERM_MONTHS, m)
    const equity = homeValue - balance
    const cumulativeMaintenance = monthlyMaintenance * m
    const netPosition = equity - closingCosts - cumulativeMaintenance
    series.push({ month: m, netPosition: Math.round(netPosition) })
  }
  return series
}

/**
 * Simulates waiting `waitMonths` before buying: during the wait, the buyer
 * keeps renting (paying increasing rent, a sunk cost) while stacking
 * monthly savings into a larger down payment. After the wait period, they
 * buy at the (appreciated) future price with the larger down payment,
 * amortizing from that point forward. Net position at any month t is:
 *   - during the wait: -(cumulative rent paid) + (savings accumulated, since
 *     savings still belong to the buyer as liquid net worth)
 *   - after the wait: (home equity at that point) - closing costs -
 *     cumulative maintenance - cumulative rent paid during the wait
 *     (rent is a real cost already incurred, so it remains a permanent drag
 *     on net position, same as buy-now's closing costs).
 */
function simulateWait(inputs: SimulationInputs, waitMonths: number, totalMonths: number): MonthPoint[] {
  const { homePrice, downPaymentSaved, monthlySavings, rent, rate, appreciation, rentIncrease } = inputs
  const monthlyAppreciation = appreciation / 100 / 12
  const monthlyRentIncrease = rentIncrease / 100 / 12

  const series: MonthPoint[] = []
  let cumulativeRent = 0
  let currentRent = rent

  // Pre-compute price and down payment at the moment of purchase.
  const priceAtPurchase = homePrice * Math.pow(1 + monthlyAppreciation, waitMonths)
  const savingsAtPurchase = downPaymentSaved + monthlySavings * waitMonths
  const downPaymentAtPurchase = Math.min(savingsAtPurchase, priceAtPurchase)
  const closingCostsAtPurchase = priceAtPurchase * CLOSING_COST_RATE
  const loanPrincipalAtPurchase = Math.max(priceAtPurchase - downPaymentAtPurchase, 0)
  const monthlyMaintenance = (priceAtPurchase * MAINTENANCE_RATE_ANNUAL) / 12

  for (let m = 0; m <= totalMonths; m++) {
    if (m > 0) {
      cumulativeRent += currentRent
      currentRent = currentRent * (1 + monthlyRentIncrease)
    }

    if (m < waitMonths) {
      // Still renting: net worth is liquid savings accumulated so far, minus rent paid (a real cost).
      const savingsSoFar = downPaymentSaved + monthlySavings * m
      const netPosition = savingsSoFar - cumulativeRent
      series.push({ month: m, netPosition: Math.round(netPosition) })
    } else {
      const monthsSincePurchase = m - waitMonths
      const homeValue = priceAtPurchase * Math.pow(1 + monthlyAppreciation, monthsSincePurchase)
      const balance = remainingBalance(loanPrincipalAtPurchase, rate, LOAN_TERM_MONTHS, monthsSincePurchase)
      const equity = homeValue - balance
      const cumulativeMaintenance = monthlyMaintenance * monthsSincePurchase
      const netPosition = equity - closingCostsAtPurchase - cumulativeMaintenance - cumulativeRent
      series.push({ month: m, netPosition: Math.round(netPosition) })
    }
  }
  return series
}

const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  'buy-now': 'Buy the home',
  'wait-12': 'Wait 12 months',
  'wait-24': 'Wait 24 months',
}

/** Simulates a single scenario over `months` (default 60 = 5 years). */
export function simulateScenario(key: ScenarioKey, inputs: SimulationInputs, months = 60): ScenarioOutcome {
  const series =
    key === 'buy-now' ? simulateBuyNow(inputs, months) : simulateWait(inputs, key === 'wait-12' ? 12 : 24, months)
  const netPositionAt60 = series[series.length - 1]?.netPosition ?? 0
  return { key, label: SCENARIO_LABELS[key], netPositionAt60, series }
}

/** Simulates all three scenarios at once for side-by-side comparison. */
export function simulateAllScenarios(inputs: SimulationInputs, months = 60): ScenarioOutcome[] {
  return (['buy-now', 'wait-12', 'wait-24'] as ScenarioKey[]).map((key) => simulateScenario(key, inputs, months))
}

export const DEFAULT_SIMULATION_INPUTS: SimulationInputs = {
  homePrice: 400_000,
  downPaymentSaved: 40_000,
  monthlySavings: 1_500,
  rent: 2_200,
  rate: 6.5,
  appreciation: 3.5,
  rentIncrease: 4,
}

/* ================================================================== */
/* lib/decisions/state.ts — same pattern, key homi-rehearsal-v1        */
/* ================================================================== */

const STORAGE_KEY = 'homi-rehearsal-v1'

/**
 * Load saved rehearsal inputs, merged over the supplied defaults
 * (ledger-derived at call time). Corrupt JSON / wrong shapes fall back to
 * the defaults. SSR-safe.
 */
export function loadRehearsalInputs(defaults: SimulationInputs = DEFAULT_SIMULATION_INPUTS): SimulationInputs {
  if (typeof window === 'undefined') return defaults
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<SimulationInputs>
    if (!parsed || typeof parsed !== 'object') return defaults
    return { ...defaults, ...pickNumericFields(parsed) }
  } catch {
    return defaults
  }
}

/** Save rehearsal inputs to localStorage. SSR-safe no-op on the server. */
export function saveRehearsalInputs(inputs: SimulationInputs): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pickNumericFields(inputs)))
  } catch {
    // Storage unavailable — the page still works for this session.
  }
}

/** Keep only the expected numeric fields so corrupted storage can't grow. */
function pickNumericFields(parsed: Partial<SimulationInputs>): Partial<SimulationInputs> {
  const keys: (keyof SimulationInputs)[] = [
    'homePrice',
    'downPaymentSaved',
    'monthlySavings',
    'rent',
    'rate',
    'appreciation',
    'rentIncrease',
  ]
  const result: Partial<SimulationInputs> = {}
  for (const key of keys) {
    const value = parsed[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[key] = value
    }
  }
  return result
}

/* ================================================================== */
/* lib/readiness/scenario.ts — verbatim math + copy                    */
/* ================================================================== */

export interface ScenarioStudioInput extends SimulationInputs {
  /** Current readiness verdict for honesty chrome */
  readinessVerdict?: VerdictKey | null
  readinessScore?: number | null
}

export interface ScenarioStudioResult {
  scenarios: ScenarioOutcome[]
  bestKey: string
  bestLabel: string
  spreadAt60: number
  readinessNote: string
  disclaimer: string
}

export const SCENARIO_DISCLAIMER =
  'Educational model only — not a forecast, appraisal, or lending decision. ' +
  'Net position is a simplified 5-year illustration.'

export function runScenarioStudio(input: ScenarioStudioInput, months = 60): ScenarioStudioResult {
  const scenarios = simulateAllScenarios(input, months)
  const best = scenarios.reduce((a, b) => (b.netPositionAt60 > a.netPositionAt60 ? b : a))
  const worst = scenarios.reduce((a, b) => (b.netPositionAt60 < a.netPositionAt60 ? b : a))
  const spreadAt60 = best.netPositionAt60 - worst.netPositionAt60

  let readinessNote =
    'Pair this model with Path to Ready — a better net position does not clear protective hard-stops.'
  if (input.readinessVerdict === 'NOT_YET') {
    readinessNote =
      'Your readiness verdict is DO NOT PROCEED. Even if wait/buy math favors a scenario, ' +
      'clear hard-stops before treating any path as actionable.'
  } else if (input.readinessVerdict === 'BUILD_FIRST') {
    readinessNote =
      'BUILD FIRST: use the wait scenarios as time to fund runway and alignment — not as permission to stretch.'
  } else if (input.readinessVerdict === 'READY') {
    readinessNote = 'READY band on last assessment — still re-check Path to Ready if inputs moved.'
  }

  return {
    scenarios,
    bestKey: best.key,
    bestLabel: best.label,
    spreadAt60,
    readinessNote,
    disclaimer: SCENARIO_DISCLAIMER,
  }
}

export function scenarioInputsFromFinance(opts: {
  liquidSavings?: number
  monthlyIncome?: number
  monthlyExpenses?: number
  monthlyDebtPayments?: number
  downPaymentTarget?: number
}): SimulationInputs {
  const surplus =
    opts.monthlyIncome != null && opts.monthlyExpenses != null
      ? Math.max(0, opts.monthlyIncome - opts.monthlyExpenses - (opts.monthlyDebtPayments ?? 0))
      : DEFAULT_SIMULATION_INPUTS.monthlySavings

  return {
    ...DEFAULT_SIMULATION_INPUTS,
    downPaymentSaved: opts.liquidSavings ?? DEFAULT_SIMULATION_INPUTS.downPaymentSaved,
    monthlySavings: surplus || DEFAULT_SIMULATION_INPUTS.monthlySavings,
    homePrice: Math.max(DEFAULT_SIMULATION_INPUTS.homePrice, (opts.downPaymentTarget ?? 60_000) * 5),
  }
}

/**
 * Ledger-derived rehearsal defaults — the local adaptation of canon's
 * finance-store pull. Pure: reads the budget state through the store's
 * pure selectors (never the React context) so it stays deterministic and
 * testable. Rent defaults to this month's housing-category spend when the
 * ledger has it (canon has no rent selector — closest honest proxy).
 */
export function scenarioDefaultsFromBudget(state: BudgetState, houseGoal?: Goal): SimulationInputs {
  const base = scenarioInputsFromFinance({
    liquidSavings: liquidSavings(state),
    monthlyIncome: monthIncome(state, 0),
    monthlyExpenses: monthExpenses(state, 0),
    monthlyDebtPayments: state.monthlyDebtPayments,
    downPaymentTarget: houseGoal?.target,
  })
  const housingSpend = transactionsInMonth(state, 0)
    .filter((t) => t.type === 'expense' && t.categoryId === 'housing')
    .reduce((s, t) => s + t.amount, 0)
  return { ...base, rent: housingSpend > 0 ? Math.round(housingSpend) : base.rent }
}

/* ================================================================== */
/* lib/readiness/path.ts types + lib/readiness/scenario-path.ts        */
/* Types + disclaimer ported verbatim; hard-stop check adapted to our  */
/* string HardStopKey[].                                               */
/* ================================================================== */

export type PathStepKind = 'milestone' | 'deadline' | 'review'

export type PathReasonCode =
  | HardStopKey
  | 'PILLAR_FINANCIAL'
  | 'PILLAR_EMOTIONAL'
  | 'PILLAR_TIMING'
  | 'NEGATIVE_CASHFLOW'
  | 'PARTNER_ALIGNMENT'
  | 'REASSESS'
  | 'MAINTENANCE'
  | 'READY_CELEBRATE'

export type PathStepStatus = 'pending' | 'done' | 'skipped'

export interface PathStep {
  id: string
  title: string
  kind: PathStepKind
  /** Offset from generation day; first step must be ≤ 7. */
  daysFromNow: number
  reasonCode: PathReasonCode
  /** Internal product route (no locale prefix). */
  href: string
  /** Protective, educational voice — never shaming. */
  notes: string
  fundingTarget: number | null
  fundingLabel: string | null
  /** Completion — defaults to pending for legacy paths. */
  status: PathStepStatus
  completedAt: string | null
}

export interface ReadinessPath {
  id: string
  version: 1
  createdAt: string
  assessmentCompletedAt: string | null
  verdict: VerdictKey
  score: number
  bindingConstraint: PathReasonCode | null
  confidence: 'assessment_only' | 'assessment_plus_finance'
  disclaimer: string
  steps: PathStep[]
  mode: 'build' | 'ready_optional'
  /** ISO when steps were written to the decision calendar (null if not). */
  calendarCommittedAt: string | null
}

export const PATH_DISCLAIMER =
  'Educational readiness only — not a commitment to lend, credit approval, ' +
  'or personalized financial, legal, or tax advice. Re-run the assessment ' +
  'before any irreversible move.'

function pathId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `sp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function step(partial: Omit<PathStep, 'id' | 'status' | 'completedAt'>): PathStep {
  return {
    ...partial,
    id: pathId(),
    status: 'pending',
    completedAt: null,
  }
}

/**
 * Generate a path that funds the chosen wait scenario (default wait-12).
 */
export function generatePathFromScenario(opts: {
  inputs: SimulationInputs
  scenarioKey?: ScenarioKey
  assessmentResult?: ScoreResult | null
  assessmentCompletedAt?: string | null
}): ReadinessPath {
  const scenarioKey = opts.scenarioKey ?? 'wait-12'
  const studio = runScenarioStudio({
    ...opts.inputs,
    readinessVerdict: opts.assessmentResult?.verdict ?? null,
    readinessScore: opts.assessmentResult?.score ?? null,
  })
  const chosen = studio.scenarios.find((s) => s.key === scenarioKey) ?? studio.scenarios[1]
  const months = scenarioKey === 'wait-24' ? 24 : scenarioKey === 'wait-12' ? 12 : 0
  const gap = Math.max(0, opts.inputs.homePrice * 0.2 - opts.inputs.downPaymentSaved)
  const monthlyNeeded = months > 0 ? Math.ceil(gap / months) : Math.max(opts.inputs.monthlySavings, 0)

  const verdict: VerdictKey = opts.assessmentResult?.verdict ?? 'BUILD_FIRST'
  const score = opts.assessmentResult?.score ?? 55
  const hardStops: HardStopKey[] = opts.assessmentResult?.hardStops ?? []

  const steps: PathStep[] = []

  if (hardStops.some((h) => h === 'RUNWAY_UNDER_1_MONTH')) {
    steps.push(
      step({
        title: 'Clear runway hard-stop before funding a wait plan',
        kind: 'deadline',
        daysFromNow: 3,
        reasonCode: 'RUNWAY_UNDER_1_MONTH',
        href: '/tools/runway',
        notes:
          'Protective gate blocks purchase timing. Stabilize cash buffer first. ' + PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
      }),
    )
  }

  if (months > 0) {
    steps.push(
      step({
        title: `Fund the ${months}-month wait: save ~$${monthlyNeeded.toLocaleString('en-US')}/mo toward down payment`,
        kind: 'milestone',
        daysFromNow: 7,
        reasonCode: 'PILLAR_TIMING',
        href: '/tools/down-payment',
        notes:
          `Scenario ${chosen.label}: gap to 20% down is ~$${Math.round(gap).toLocaleString('en-US')}. ` +
          `At ${months} months that is ~$${monthlyNeeded.toLocaleString('en-US')}/mo (illustrative). ` +
          PATH_DISCLAIMER,
        fundingTarget: Math.round(gap),
        fundingLabel: 'Down-payment gap to fund during wait',
      }),
    )
    steps.push(
      step({
        title: `Lock monthly auto-transfer of ~$${monthlyNeeded.toLocaleString('en-US')}`,
        kind: 'deadline',
        daysFromNow: 14,
        reasonCode: 'PILLAR_FINANCIAL',
        href: '/finance',
        notes:
          'Path funding is intentional — record the transfer in Finance Command. ' + PATH_DISCLAIMER,
        fundingTarget: monthlyNeeded,
        fundingLabel: 'Monthly wait-plan transfer',
      }),
    )
  } else {
    steps.push(
      step({
        title: 'Buy-now scenario: re-check Pre-Flight and affordability',
        kind: 'deadline',
        daysFromNow: 3,
        reasonCode: 'PILLAR_FINANCIAL',
        href: '/tools/preflight',
        notes:
          'Buy-now wins on net position in the model — still run protective gates. ' + PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
      }),
    )
  }

  steps.push(
    step({
      title: 'Re-run scenario studio after 30 days of funded savings',
      kind: 'review',
      daysFromNow: 30,
      reasonCode: 'REASSESS',
      href: '/scenarios',
      notes: 'Models drift when rates and savings change. ' + PATH_DISCLAIMER,
      fundingTarget: null,
      fundingLabel: null,
    }),
  )

  steps.push(
    step({
      title: 'Re-take assessment before acting on the scenario',
      kind: 'review',
      daysFromNow: Math.min(90, months > 0 ? months * 30 : 45),
      reasonCode: 'REASSESS',
      href: '/assessment',
      notes: PATH_DISCLAIMER,
      fundingTarget: null,
      fundingLabel: null,
    }),
  )

  return {
    id: pathId(),
    version: 1,
    createdAt: new Date().toISOString(),
    assessmentCompletedAt: opts.assessmentCompletedAt ?? null,
    verdict,
    score,
    bindingConstraint: months > 0 ? 'PILLAR_TIMING' : 'PILLAR_FINANCIAL',
    confidence: 'assessment_only',
    disclaimer: PATH_DISCLAIMER,
    mode: 'build',
    calendarCommittedAt: null,
    steps: steps.slice(0, 7),
  }
}
