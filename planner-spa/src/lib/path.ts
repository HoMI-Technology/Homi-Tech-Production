/**
 * Path to Ready — VERBATIM-adapted port of canon lib/readiness/path.ts
 * (binding-constraint generator) + progress.ts + autocomplete.ts +
 * evidence.ts + habit.ts + versions.ts + legal.ts.
 *
 * Source of truth: HoMI-Technology/Homi-Tech-Production @ 204e118e.
 * Step copy / why-lines / disclaimers are character-for-character canon.
 *
 * ADAPTATION (local shapes only):
 * - Canon `AssessmentResult` (scoring/engine.ts) → local `PathAssessment`,
 *   derived from our `ScoreResult` via `assessmentFromScore()`. Same field
 *   names: financial/emotional/timing subscore points + verdict + hardStops.
 * - Canon product routes (/tools/runway, /journal, …) → our app routes
 *   (/goals, /transactions, /readiness, /partner). Notes copy is untouched
 *   verbatim, including its inline route mentions.
 * - No server sync (canon store.ts LWW dropped); versions.ts is already
 *   local-only and is kept as-is.
 * - Calendar note markers + session-once analytics flags are not ported
 *   (no decision calendar / analytics surfaces in this app).
 *
 * Verdicts, weights, thresholds are never re-stated here — they come from
 * `@/lib/score` (the ported canonical engine).
 */

import {
  HARD_STOP_MESSAGES,
  PILLAR_MAX_POINTS,
  type HardStopKey,
  type PillarKey,
  type ScoreResult,
  type VerdictKey,
} from '@/lib/score'

// ---------------------------------------------------------------------------
// Legal chrome (canon legal.ts — verbatim copy, SSOT for path surfaces)
// ---------------------------------------------------------------------------

export const PATH_LEGAL_SHORT =
  'Not a commitment to lend. Not credit approval. Educational only — reassess before irreversible moves.'

export const PREFLIGHT_LEGAL_SHORT =
  'Protective check only. Not a loan decision or guarantee of affordability.'

export const CERTIFICATE_LEGAL =
  'This credential summarizes self-reported and product-computed readiness signals ' +
  'at a point in time. It is not a credit report, appraisal, underwriting decision, ' +
  'or commitment to lend. Partners may use it for education only.'

// ---------------------------------------------------------------------------
// Types (canon path.ts)
// ---------------------------------------------------------------------------

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

export type PathConfidence = 'assessment_only' | 'assessment_plus_finance'

export type PathMode = 'build' | 'ready_optional'

export type PathStepStatus = 'pending' | 'done' | 'skipped'

export interface PathStep {
  id: string
  title: string
  kind: PathStepKind
  /** Offset from generation day; first step must be ≤ 7. */
  daysFromNow: number
  reasonCode: PathReasonCode
  /** Internal product route (this app's router). */
  href: string
  /** Protective, educational voice — never shaming. Verbatim canon. */
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
  confidence: PathConfidence
  disclaimer: string
  steps: PathStep[]
  mode: PathMode
}

/** Optional finance snapshot — only pass when the user has saved finance data. */
export interface PathFinanceSnapshot {
  netCashFlow: number
  runwayMonths: number | null
  monthlyExpenses: number
  liquidSavings: number
  monthlyDebtPayments: number
  monthlyIncome: number
}

export interface BuildReadinessPathOptions {
  assessmentCompletedAt?: string | null
  finance?: PathFinanceSnapshot | null
  /** Injected for tests. */
  now?: Date
  idFactory?: () => string
}

/**
 * Canon `AssessmentResult` shape consumed by the generator — the scorer owns
 * truth; this module only sequences protective next steps. Built from our
 * `ScoreResult` by `assessmentFromScore()`.
 */
export interface PathAssessment {
  score: number
  verdict: VerdictKey
  hardStops: Array<{ code: HardStopKey; message: string }>
  financial: {
    total: number
    emergencyFund: number
    debtToIncome: number
    downPayment: number
  }
  emotional: {
    total: number
    partnerAlignment: number
    fomoCheck: number
    /** True when partner points were redistributed (single buyer). */
    singleRedistribution: boolean
  }
  timing: {
    total: number
    timeHorizon: number
    savingsRate: number
    downPaymentProgress: number
  }
}

/**
 * Adapt our `ScoreResult` (pillars.*.factors) to the canon AssessmentResult
 * subscore fields. Points only — never re-derives thresholds.
 */
export function assessmentFromScore(
  result: ScoreResult,
  opts?: { singleRedistribution?: boolean },
): PathAssessment {
  const pts = (pillar: PillarKey, key: string): number =>
    result.pillars[pillar].factors.find((f) => f.key === key)?.pts ?? 0
  return {
    score: result.score,
    verdict: result.verdict,
    hardStops: result.hardStops.map((code) => ({
      code,
      message: HARD_STOP_MESSAGES[code],
    })),
    financial: {
      total: result.pillars.financial.total,
      emergencyFund: pts('financial', 'emergencyFund'),
      debtToIncome: pts('financial', 'dti'),
      downPayment: pts('financial', 'downPayment'),
    },
    emotional: {
      total: result.pillars.emotional.total,
      partnerAlignment: pts('emotional', 'partnerAlignment'),
      fomoCheck: pts('emotional', 'fomo'),
      singleRedistribution: opts?.singleRedistribution ?? false,
    },
    timing: {
      total: result.pillars.timing.total,
      timeHorizon: pts('timing', 'timeHorizon'),
      savingsRate: pts('timing', 'savingsRate'),
      downPaymentProgress: pts('timing', 'downPaymentProgress'),
    },
  }
}

// ---------------------------------------------------------------------------
// Constants (canon path.ts)
// ---------------------------------------------------------------------------

/** Hard-stop priority: fix solvency before credit/housing optics. */
export const HARD_STOP_ORDER: readonly HardStopKey[] = [
  'RUNWAY_UNDER_1_MONTH',
  'DTI_OVER_50',
  'HOUSING_RATIO_OVER_45',
  'CREDIT_UNDER_620',
] as const

export const PATH_DISCLAIMER =
  'Educational readiness only — not a commitment to lend, credit approval, ' +
  'or personalized financial, legal, or tax advice. Re-run the assessment ' +
  'before any irreversible move.'

export const MAX_PATH_STEPS = 7
export const FIRST_STEP_MAX_DAYS = 7

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `path-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function stepId(idFactory: () => string): string {
  return idFactory()
}

function pendingFields(): Pick<PathStep, 'status' | 'completedAt'> {
  return { status: 'pending', completedAt: null }
}

/** Normalize legacy localStorage paths missing status. */
export function normalizeReadinessPath(raw: unknown): ReadinessPath | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<ReadinessPath>
  if (p.version !== 1 || !Array.isArray(p.steps) || typeof p.id !== 'string') {
    return null
  }
  const steps: PathStep[] = p.steps.map((s, i) => {
    const step = s as Partial<PathStep>
    return {
      id: typeof step.id === 'string' ? step.id : `legacy-${i}`,
      title: String(step.title ?? 'Step'),
      kind: (step.kind as PathStep['kind']) ?? 'milestone',
      daysFromNow: typeof step.daysFromNow === 'number' ? step.daysFromNow : 0,
      reasonCode: (step.reasonCode as PathReasonCode) ?? 'REASSESS',
      href: typeof step.href === 'string' ? step.href : '/readiness',
      notes: typeof step.notes === 'string' ? step.notes : '',
      fundingTarget: typeof step.fundingTarget === 'number' ? step.fundingTarget : null,
      fundingLabel: typeof step.fundingLabel === 'string' ? step.fundingLabel : null,
      status:
        step.status === 'done' || step.status === 'skipped' || step.status === 'pending'
          ? step.status
          : 'pending',
      completedAt: typeof step.completedAt === 'string' ? step.completedAt : null,
    }
  })
  return {
    id: p.id,
    version: 1,
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
    assessmentCompletedAt:
      typeof p.assessmentCompletedAt === 'string' ? p.assessmentCompletedAt : null,
    verdict: (p.verdict as VerdictKey) ?? 'NOT_YET',
    score: typeof p.score === 'number' ? p.score : 0,
    bindingConstraint: (p.bindingConstraint as PathReasonCode | null) ?? null,
    confidence:
      p.confidence === 'assessment_plus_finance' ? 'assessment_plus_finance' : 'assessment_only',
    disclaimer: typeof p.disclaimer === 'string' ? p.disclaimer : PATH_DISCLAIMER,
    steps,
    mode: p.mode === 'ready_optional' ? 'ready_optional' : 'build',
  }
}

/** Mark a step done/skipped; returns new path (immutable). */
export function setPathStepStatus(
  path: ReadinessPath,
  stepId: string,
  status: PathStepStatus,
  now: Date = new Date(),
): ReadinessPath {
  return {
    ...path,
    steps: path.steps.map((s) =>
      s.id === stepId
        ? {
            ...s,
            status,
            completedAt: status === 'pending' ? null : now.toISOString(),
          }
        : s,
    ),
  }
}

function hardStopCodes(result: PathAssessment): HardStopKey[] {
  const present = new Set(result.hardStops.map((h) => h.code))
  return HARD_STOP_ORDER.filter((code) => present.has(code))
}

function pillarPcts(result: PathAssessment): {
  financial: number
  emotional: number
  timing: number
} {
  return {
    financial: (result.financial.total / PILLAR_MAX_POINTS.financial) * 100,
    emotional: (result.emotional.total / PILLAR_MAX_POINTS.emotional) * 100,
    timing: (result.timing.total / PILLAR_MAX_POINTS.timing) * 100,
  }
}

function weakestPillar(result: PathAssessment): 'financial' | 'emotional' | 'timing' {
  const p = pillarPcts(result)
  const ranked: Array<['financial' | 'emotional' | 'timing', number]> = [
    ['financial', p.financial],
    ['emotional', p.emotional],
    ['timing', p.timing],
  ]
  ranked.sort((a, b) => a[1] - b[1])
  return ranked[0][0]
}

// ---------------------------------------------------------------------------
// Step builders (copy verbatim from canon; routes mapped to this app)
// ---------------------------------------------------------------------------

function hardStopStep(
  code: HardStopKey,
  daysFromNow: number,
  finance: PathFinanceSnapshot | null | undefined,
  idFactory: () => string,
): PathStep {
  const id = stepId(idFactory)
  switch (code) {
    case 'RUNWAY_UNDER_1_MONTH': {
      const monthly =
        finance && finance.monthlyExpenses + finance.monthlyDebtPayments > 0
          ? finance.monthlyExpenses + finance.monthlyDebtPayments
          : null
      const gap =
        monthly != null && finance
          ? Math.max(0, Math.round(monthly - finance.liquidSavings))
          : null
      return {
        id,
        title: 'Stabilize emergency runway to at least 1 month',
        kind: 'deadline',
        daysFromNow,
        reasonCode: code,
        href: '/goals',
        notes:
          'Protective gate: under 1 month of runway forces DO NOT PROCEED. ' +
          'Build cash covering one full month of expenses before any major purchase. ' +
          PATH_DISCLAIMER,
        fundingTarget: gap,
        fundingLabel: gap != null ? 'Cash still needed for 1-month runway' : null,
        ...pendingFields(),
      }
    }
    case 'DTI_OVER_50':
      return {
        id,
        title: 'Bring debt-to-income below the protective line',
        kind: 'deadline',
        daysFromNow,
        reasonCode: code,
        href: '/transactions',
        notes:
          'Protective gate: DTI above 50% blocks readiness regardless of score. ' +
          'Prioritize high-rate balances and free monthly cash flow. ' +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      }
    case 'HOUSING_RATIO_OVER_45':
      return {
        id,
        title: 'Re-scope housing so payment stays under 45% of income',
        kind: 'milestone',
        daysFromNow,
        reasonCode: code,
        href: '/readiness',
        notes:
          'Protective gate: housing cost above 45% of gross income. ' +
          'Lower the target payment or raise income before proceeding. ' +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      }
    case 'CREDIT_UNDER_620':
      return {
        id,
        title: 'Rebuild credit above the 620 protective floor',
        kind: 'milestone',
        daysFromNow,
        reasonCode: code,
        href: '/readiness',
        notes:
          'Protective gate: credit under 620 forces DO NOT PROCEED. ' +
          'On-time payments and lower utilization move this gate first. ' +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      }
  }
}

function cashFlowStep(daysFromNow: number, idFactory: () => string): PathStep {
  return {
    id: stepId(idFactory),
    title: 'Stop negative cash flow before building aspirational goals',
    kind: 'deadline',
    daysFromNow,
    reasonCode: 'NEGATIVE_CASHFLOW',
    href: '/transactions',
    notes:
      'Your saved finance picture shows more leaving than entering each month. ' +
      'Path to Ready parks house-hunting milestones until monthly surplus is ≥ $0. ' +
      PATH_DISCLAIMER,
    fundingTarget: null,
    fundingLabel: null,
    ...pendingFields(),
  }
}

function pillarSteps(
  result: PathAssessment,
  startDay: number,
  idFactory: () => string,
): PathStep[] {
  const steps: PathStep[] = []
  const p = pillarPcts(result)
  const weakest = weakestPillar(result)
  let day = startDay

  const push = (step: Omit<PathStep, 'id' | 'daysFromNow'> & { daysFromNow?: number }) => {
    steps.push({
      ...step,
      id: stepId(idFactory),
      daysFromNow: step.daysFromNow ?? day,
    })
    day += 14
  }

  if (weakest === 'financial' || p.financial < 70) {
    if (result.financial.emergencyFund < 6) {
      push({
        title: 'Grow emergency fund toward 3–6 months',
        kind: 'milestone',
        reasonCode: 'PILLAR_FINANCIAL',
        href: '/goals',
        notes:
          'Financial Reality is a primary gap. Runway depth is the foundation under every other goal. ' +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      })
    }
    if (result.financial.debtToIncome < 7) {
      push({
        title: 'Lower monthly debt burden (target DTI ≤ 36%)',
        kind: 'milestone',
        reasonCode: 'PILLAR_FINANCIAL',
        href: '/transactions',
        notes:
          'Debt payments compress readiness. Use avalanche/snowball on /tools/debt-payoff. ' +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      })
    }
    if (result.financial.downPayment < 7 || result.timing.downPaymentProgress < 7) {
      push({
        title: 'Advance down-payment progress with a funded target',
        kind: 'milestone',
        reasonCode: 'PILLAR_FINANCIAL',
        href: '/goals',
        notes:
          'Down-payment progress is incomplete. Set a monthly transfer and track the gap. ' +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      })
    }
  }

  if (weakest === 'emotional' || p.emotional < 70) {
    if (!result.emotional.singleRedistribution && result.emotional.partnerAlignment < 5) {
      push({
        title: 'Household alignment session (budget ceiling + deal-breakers)',
        kind: 'milestone',
        reasonCode: 'PARTNER_ALIGNMENT',
        href: '/partner',
        notes:
          'Partner alignment is a readiness input — not a formality. ' +
          'Agree on max budget and non-negotiables before shopping. ' +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      })
    } else if (result.emotional.fomoCheck < 5) {
      push({
        title: 'Cool external pressure — 30 quiet days on the decision',
        kind: 'review',
        reasonCode: 'PILLAR_EMOTIONAL',
        href: '/readiness',
        notes:
          'Pressure check is low: urgency may be external. ' +
          "Use the journal to separate your timeline from someone else's. " +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      })
    } else {
      push({
        title: 'Emotional Truth check-in — why this decision, why now',
        kind: 'review',
        reasonCode: 'PILLAR_EMOTIONAL',
        href: '/readiness',
        notes:
          'Emotional Truth is the weaker pillar. Clarity here prevents expensive regret. ' +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      })
    }
  }

  if (weakest === 'timing' || p.timing < 70) {
    if (result.timing.timeHorizon < 7) {
      push({
        title: 'Extend the decision horizon past a rushed window',
        kind: 'milestone',
        reasonCode: 'PILLAR_TIMING',
        href: '/readiness',
        notes:
          'Short horizons inflate FOMO pricing. Give the decision more calendar room. ' +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      })
    }
    if (result.timing.savingsRate < 7) {
      push({
        title: 'Raise savings rate toward 15–20% of income',
        kind: 'milestone',
        reasonCode: 'PILLAR_TIMING',
        href: '/transactions',
        notes:
          'Timing follows momentum. Savings rate is the lever that moves purchase readiness. ' +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      })
    }
  }

  return steps
}

function reassessStep(daysFromNow: number, idFactory: () => string): PathStep {
  return {
    id: stepId(idFactory),
    title: 'Re-take the assessment and update your path',
    kind: 'review',
    daysFromNow,
    reasonCode: 'REASSESS',
    href: '/readiness',
    notes:
      'Paths go stale. Re-score with the same engine before treating readiness as current. ' +
      PATH_DISCLAIMER,
    fundingTarget: null,
    fundingLabel: null,
    ...pendingFields(),
  }
}

function readyOptionalStep(idFactory: () => string): PathStep {
  return {
    id: stepId(idFactory),
    title: 'Optional 90-day readiness review',
    kind: 'review',
    daysFromNow: 90,
    reasonCode: 'MAINTENANCE',
    href: '/readiness',
    notes:
      'You are in the READY band on your last assessment. ' +
      'No forced homework — optional review only if life inputs change. ' +
      PATH_DISCLAIMER,
    fundingTarget: null,
    fundingLabel: null,
    ...pendingFields(),
  }
}

// ---------------------------------------------------------------------------
// Public API — the generator (canon buildReadinessPath, verbatim logic)
// ---------------------------------------------------------------------------

/**
 * Build a versioned Path to Ready from an assessment result.
 * Pass `finance` only when the user has saved finance state.
 */
export function buildReadinessPath(
  result: PathAssessment,
  options: BuildReadinessPathOptions = {},
): ReadinessPath {
  const idFactory = options.idFactory ?? defaultId
  const finance = options.finance ?? null
  const confidence: PathConfidence = finance ? 'assessment_plus_finance' : 'assessment_only'
  const createdAt = (options.now ?? new Date()).toISOString()
  const pathId = idFactory()

  const base = {
    id: pathId,
    version: 1 as const,
    createdAt,
    assessmentCompletedAt: options.assessmentCompletedAt ?? null,
    verdict: result.verdict,
    score: result.score,
    confidence,
    disclaimer: PATH_DISCLAIMER,
  }

  // READY with no hard-stops → celebrate, no forced homework
  if (result.verdict === 'READY' && result.hardStops.length === 0) {
    return {
      ...base,
      bindingConstraint: 'READY_CELEBRATE',
      mode: 'ready_optional',
      steps: [readyOptionalStep(idFactory)],
    }
  }

  const steps: PathStep[] = []
  let binding: PathReasonCode | null = null
  let dayCursor = 3 // first action inside 7 days

  const stops = hardStopCodes(result)
  if (stops.length > 0) {
    binding = stops[0]
    for (let i = 0; i < stops.length; i++) {
      const d = i === 0 ? 3 : 14 + (i - 1) * 21
      steps.push(hardStopStep(stops[i], d, finance, idFactory))
      dayCursor = d + 14
    }
  }

  // Negative cash flow (only with real finance data) — after hard-stops or alone
  if (finance && finance.netCashFlow < 0) {
    if (!binding) binding = 'NEGATIVE_CASHFLOW'
    const alreadyCash = steps.some((s) => s.reasonCode === 'NEGATIVE_CASHFLOW')
    if (!alreadyCash) {
      steps.unshift(cashFlowStep(Math.min(3, FIRST_STEP_MAX_DAYS), idFactory))
      // re-number first hard-stop later if needed — keep cash first
      dayCursor = Math.max(dayCursor, 17)
    }
  }

  if (stops.length === 0) {
    const soft = pillarSteps(result, dayCursor, idFactory)
    if (!binding && soft.length > 0) {
      binding = soft[0].reasonCode
    }
    steps.push(...soft)
  } else {
    // After hard-stops, add at most one soft pillar step if room
    const soft = pillarSteps(result, dayCursor, idFactory).slice(0, 1)
    steps.push(...soft)
  }

  // Cap before reassess so we always leave room
  const capped = steps.slice(0, MAX_PATH_STEPS - 1)

  // Ensure first step ≤ 7 days
  if (capped.length > 0 && capped[0].daysFromNow > FIRST_STEP_MAX_DAYS) {
    capped[0] = { ...capped[0], daysFromNow: FIRST_STEP_MAX_DAYS }
  }

  const reassessDay = Math.min(90, Math.max(30, (capped[capped.length - 1]?.daysFromNow ?? 14) + 21))
  capped.push(reassessStep(reassessDay, idFactory))

  // Deduplicate href+title pairs roughly
  const seen = new Set<string>()
  const deduped: PathStep[] = []
  for (const s of capped) {
    const key = `${s.reasonCode}|${s.title}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(s)
  }

  // Negative cash flow should remain first if present
  deduped.sort((a, b) => {
    if (a.reasonCode === 'NEGATIVE_CASHFLOW' && b.reasonCode !== 'NEGATIVE_CASHFLOW') {
      return -1
    }
    if (b.reasonCode === 'NEGATIVE_CASHFLOW' && a.reasonCode !== 'NEGATIVE_CASHFLOW') {
      return 1
    }
    return a.daysFromNow - b.daysFromNow
  })

  const finalSteps = deduped.slice(0, MAX_PATH_STEPS)
  if (finalSteps.length > 0 && finalSteps[0].daysFromNow > FIRST_STEP_MAX_DAYS) {
    finalSteps[0] = { ...finalSteps[0], daysFromNow: FIRST_STEP_MAX_DAYS }
  }

  if (!binding && finalSteps.length > 0) {
    binding = finalSteps[0].reasonCode
  }

  return {
    ...base,
    bindingConstraint: binding,
    mode: 'build',
    steps: finalSteps,
  }
}

export function bindingConstraintLabel(code: PathReasonCode | null): string {
  if (!code) return 'Readiness gaps'
  switch (code) {
    case 'RUNWAY_UNDER_1_MONTH':
      return 'Emergency runway under 1 month'
    case 'DTI_OVER_50':
      return 'Debt-to-income above 50%'
    case 'HOUSING_RATIO_OVER_45':
      return 'Housing cost above 45% of income'
    case 'CREDIT_UNDER_620':
      return 'Credit under 620'
    case 'NEGATIVE_CASHFLOW':
      return 'Negative monthly cash flow'
    case 'PILLAR_FINANCIAL':
      return 'Financial Reality gap'
    case 'PILLAR_EMOTIONAL':
      return 'Emotional Truth gap'
    case 'PILLAR_TIMING':
      return 'Perfect Timing gap'
    case 'PARTNER_ALIGNMENT':
      return 'Partner alignment'
    case 'REASSESS':
      return 'Reassessment due'
    case 'MAINTENANCE':
      return 'Optional maintenance'
    case 'READY_CELEBRATE':
      return 'READY — optional review only'
    default:
      return 'Readiness gaps'
  }
}

// ---------------------------------------------------------------------------
// Progress (canon progress.ts — verbatim logic)
// ---------------------------------------------------------------------------

export interface BindingProgress {
  code: PathReasonCode | null
  label: string
  /** e.g. current runway months or DTI % — null when unknown */
  current: number | null
  target: number | null
  unit: string | null
  /** 0–1 capped; null when not computable */
  ratio: number | null
  cleared: boolean
  detail: string
}

export interface PathFreshness {
  assessmentAgeDays: number | null
  financeAgeDays: number | null
  pathAgeDays: number | null
  /** True when assessment or path is older than thresholds */
  isStale: boolean
  reasons: string[]
}

/** Assessment older than this → treat path as stale for big moves. */
export const ASSESSMENT_STALE_DAYS = 90
/** Path older than this without reassess → nudge regenerate. */
export const PATH_STALE_DAYS = 90

function daysSinceIso(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  const days = Math.floor((now.getTime() - t) / 86_400_000)
  if (days < 0 || days > 3650) return null
  return days
}

function hardStopPresent(result: PathAssessment, code: HardStopKey): boolean {
  return result.hardStops.some((h) => h.code === code)
}

/**
 * Progress against the binding constraint using live assessment + optional finance.
 * Prefer finance runway/DTI when confidence is assessment_plus_finance style snapshot.
 */
export function computeBindingProgress(
  path: ReadinessPath | null,
  result: PathAssessment | null,
  finance: PathFinanceSnapshot | null,
): BindingProgress {
  const code = path?.bindingConstraint ?? null
  const label = bindingConstraintLabel(code)

  if (!code || code === 'READY_CELEBRATE' || code === 'MAINTENANCE') {
    return {
      code,
      label,
      current: null,
      target: null,
      unit: null,
      ratio: 1,
      cleared: true,
      detail: 'No protective gate is blocking this path.',
    }
  }

  if (code === 'RUNWAY_UNDER_1_MONTH') {
    const fromFinance =
      finance?.runwayMonths != null && Number.isFinite(finance.runwayMonths)
        ? finance.runwayMonths
        : null
    // Assessment uses emergency fund months as the scorer input
    const current = fromFinance
    const target = 1
    const cleared = result
      ? !hardStopPresent(result, 'RUNWAY_UNDER_1_MONTH')
      : current != null && current >= target
    const ratio =
      current != null && target > 0
        ? Math.min(1, Math.max(0, current / target))
        : cleared
          ? 1
          : 0
    return {
      code,
      label,
      current: current != null ? Math.round(current * 10) / 10 : null,
      target,
      unit: 'months',
      ratio,
      cleared,
      detail:
        current != null
          ? `Runway ~${(Math.round(current * 10) / 10).toFixed(1)} of ${target} month protective floor.`
          : cleared
            ? 'Runway hard-stop is clear on the latest assessment.'
            : 'Runway under 1 month — open Finance or reassess to measure progress.',
    }
  }

  if (code === 'DTI_OVER_50') {
    const dti =
      finance && finance.monthlyIncome > 0
        ? (finance.monthlyDebtPayments / finance.monthlyIncome) * 100
        : null
    const target = 50
    const cleared = result ? !hardStopPresent(result, 'DTI_OVER_50') : dti != null && dti <= target
    // Progress: lower DTI is better — map 80%+ → 0, 50% → 1
    const ratio =
      dti != null ? Math.min(1, Math.max(0, (80 - dti) / (80 - target))) : cleared ? 1 : 0
    return {
      code,
      label,
      current: dti != null ? Math.round(dti * 10) / 10 : null,
      target,
      unit: '% DTI',
      ratio,
      cleared,
      detail:
        dti != null
          ? `Debt-to-income ~${(Math.round(dti * 10) / 10).toFixed(1)}% (protective line ${target}%).`
          : cleared
            ? 'DTI hard-stop is clear on the latest assessment.'
            : 'DTI above 50% — use debt payoff tools, then reassess.',
    }
  }

  if (code === 'HOUSING_RATIO_OVER_45') {
    const cleared = result ? !hardStopPresent(result, 'HOUSING_RATIO_OVER_45') : false
    return {
      code,
      label,
      current: null,
      target: 45,
      unit: '% housing',
      ratio: cleared ? 1 : 0,
      cleared,
      detail: cleared
        ? 'Housing-cost hard-stop is clear.'
        : 'Housing cost above 45% of income — re-scope affordability, then reassess.',
    }
  }

  if (code === 'CREDIT_UNDER_620') {
    const cleared = result ? !hardStopPresent(result, 'CREDIT_UNDER_620') : false
    return {
      code,
      label,
      current: null,
      target: 620,
      unit: 'score',
      ratio: cleared ? 1 : 0,
      cleared,
      detail: cleared
        ? 'Credit hard-stop is clear.'
        : 'Credit under 620 — rebuild on-time history, then reassess.',
    }
  }

  if (code === 'NEGATIVE_CASHFLOW') {
    const flow = finance?.netCashFlow ?? null
    const cleared = flow != null ? flow >= 0 : false
    const ratio =
      flow == null
        ? 0
        : flow >= 0
          ? 1
          : Math.min(1, Math.max(0, 1 + flow / Math.max(1, Math.abs(flow) * 2)))
    return {
      code,
      label,
      current: flow != null ? Math.round(flow) : null,
      target: 0,
      unit: 'USD/mo surplus',
      ratio: cleared ? 1 : ratio,
      cleared,
      detail:
        flow != null
          ? flow >= 0
            ? `Monthly surplus ~$${Math.round(flow).toLocaleString('en-US')}.`
            : `Short ~$${Math.abs(Math.round(flow)).toLocaleString('en-US')} each month.`
          : 'Save finance numbers to track cash-flow progress.',
    }
  }

  // Soft pillars / partner / reassess — resolution-based if path present.
  // Done and skipped both count as "resolved" for gate progress, but the
  // user-facing detail keeps them distinct — skipped is not complete.
  if (path) {
    const summary = summarizePathResolution(path)
    const { done, skipped, total } = summary.actionable
    const resolved = done + skipped
    const ratio = total > 0 ? resolved / total : 0
    return {
      code,
      label,
      current: resolved,
      target: Math.max(1, total),
      unit: 'steps resolved',
      ratio,
      cleared: total > 0 && ratio >= 1,
      detail:
        skipped > 0
          ? `${done} of ${total} protective steps done · ${skipped} skipped.`
          : `${done} of ${Math.max(1, total)} protective steps done.`,
    }
  }

  return {
    code,
    label,
    current: null,
    target: null,
    unit: null,
    ratio: null,
    cleared: false,
    detail: 'Generate a path to track this constraint.',
  }
}

export function computePathFreshness(
  path: ReadinessPath | null,
  opts?: {
    financeSavedAt?: string | null
    now?: Date
  },
): PathFreshness {
  const now = opts?.now ?? new Date()
  const assessmentAgeDays = daysSinceIso(path?.assessmentCompletedAt ?? null, now)
  const financeAgeDays = daysSinceIso(opts?.financeSavedAt ?? null, now)
  const pathAgeDays = daysSinceIso(path?.createdAt ?? null, now)
  const reasons: string[] = []

  if (assessmentAgeDays != null && assessmentAgeDays > ASSESSMENT_STALE_DAYS) {
    reasons.push(
      `Assessment is ${assessmentAgeDays} days old — re-score before treating readiness as current.`,
    )
  }
  if (pathAgeDays != null && pathAgeDays > PATH_STALE_DAYS) {
    reasons.push(`This path is ${pathAgeDays} days old — regenerate from a fresh assessment.`)
  }
  if (financeAgeDays != null && financeAgeDays > ASSESSMENT_STALE_DAYS) {
    reasons.push(
      `Finance numbers are ${financeAgeDays} days old — update the cockpit for honest targets.`,
    )
  }

  return {
    assessmentAgeDays,
    financeAgeDays,
    pathAgeDays,
    isStale: reasons.length > 0,
    reasons,
  }
}

/** Per-category step status counts. Done and skipped are distinct states. */
export interface PathStatusCounts {
  total: number
  done: number
  skipped: number
  pending: number
}

/**
 * Honest resolution summary for a Path.
 * - Actionable = every step whose reasonCode is not REASSESS.
 * - completedRatio counts done only; resolvedRatio counts done + skipped.
 * - Zero actionable steps → both ratios are 0 (never vacuously "complete").
 */
export interface PathResolutionSummary {
  actionable: PathStatusCounts
  reassessment: PathStatusCounts
  completedRatio: number
  resolvedRatio: number
}

function countStatuses(steps: ReadinessPath['steps']): PathStatusCounts {
  let done = 0
  let skipped = 0
  let pending = 0
  for (const step of steps) {
    const status = step.status ?? 'pending'
    if (status === 'done') done += 1
    else if (status === 'skipped') skipped += 1
    else pending += 1
  }
  return { total: steps.length, done, skipped, pending }
}

export function summarizePathResolution(path: ReadinessPath): PathResolutionSummary {
  const actionable = countStatuses(path.steps.filter((s) => s.reasonCode !== 'REASSESS'))
  const reassessment = countStatuses(path.steps.filter((s) => s.reasonCode === 'REASSESS'))
  return {
    actionable,
    reassessment,
    completedRatio: actionable.total > 0 ? actionable.done / actionable.total : 0,
    resolvedRatio:
      actionable.total > 0 ? (actionable.done + actionable.skipped) / actionable.total : 0,
  }
}

/**
 * Resolved ratio (done + skipped over non-REASSESS steps) — display it as
 * "resolved", never "complete": skipped steps count toward this number.
 */
export function pathCompletionRatio(path: ReadinessPath): number {
  const steps = path.steps.filter((s) => s.reasonCode !== 'REASSESS')
  if (steps.length === 0) {
    const all = path.steps
    if (all.length === 0) return 1
    const done = all.filter((s) => (s.status ?? 'pending') !== 'pending').length
    return done / all.length
  }
  const done = steps.filter((s) => (s.status ?? 'pending') !== 'pending').length
  return done / steps.length
}

// ---------------------------------------------------------------------------
// Auto-complete (canon autocomplete.ts — verbatim logic)
// ---------------------------------------------------------------------------

export interface AutoCompleteResult {
  path: ReadinessPath
  completedStepIds: string[]
  reasons: string[]
}

function hardStopCleared(result: PathAssessment | null, code: PathReasonCode): boolean {
  if (!result) return false
  if (
    !['RUNWAY_UNDER_1_MONTH', 'DTI_OVER_50', 'HOUSING_RATIO_OVER_45', 'CREDIT_UNDER_620'].includes(
      code,
    )
  ) {
    return false
  }
  return !result.hardStops.some((h) => h.code === code)
}

function shouldAutoComplete(
  step: PathStep,
  result: PathAssessment | null,
  finance: PathFinanceSnapshot | null,
): string | null {
  if ((step.status ?? 'pending') !== 'pending') return null

  switch (step.reasonCode) {
    case 'RUNWAY_UNDER_1_MONTH':
      if (hardStopCleared(result, 'RUNWAY_UNDER_1_MONTH')) {
        return 'Runway hard-stop cleared on latest assessment.'
      }
      if (finance?.runwayMonths != null && finance.runwayMonths >= 1) {
        return `Finance runway ~${finance.runwayMonths.toFixed(1)} months ≥ 1.`
      }
      return null
    case 'DTI_OVER_50':
      if (hardStopCleared(result, 'DTI_OVER_50')) {
        return 'DTI hard-stop cleared on latest assessment.'
      }
      if (
        finance &&
        finance.monthlyIncome > 0 &&
        (finance.monthlyDebtPayments / finance.monthlyIncome) * 100 <= 50
      ) {
        return 'Finance DTI is at or below 50%.'
      }
      return null
    case 'HOUSING_RATIO_OVER_45':
      if (hardStopCleared(result, 'HOUSING_RATIO_OVER_45')) {
        return 'Housing-ratio hard-stop cleared on latest assessment.'
      }
      return null
    case 'CREDIT_UNDER_620':
      if (hardStopCleared(result, 'CREDIT_UNDER_620')) {
        return 'Credit hard-stop cleared on latest assessment.'
      }
      return null
    case 'NEGATIVE_CASHFLOW':
      if (finance && finance.netCashFlow >= 0) {
        return 'Monthly cash flow is no longer negative.'
      }
      return null
    default:
      return null
  }
}

/**
 * Mark pending steps done when finance/assessment signals clear them.
 * Does not touch REASSESS / soft pillar steps without evidence.
 */
export function autoCompletePathFromSignals(
  path: ReadinessPath,
  result: PathAssessment | null,
  finance: PathFinanceSnapshot | null,
  now: Date = new Date(),
): AutoCompleteResult {
  let next = path
  const completedStepIds: string[] = []
  const reasons: string[] = []

  for (const step of path.steps) {
    const reason = shouldAutoComplete(step, result, finance)
    if (!reason) continue
    next = setPathStepStatus(next, step.id, 'done', now)
    completedStepIds.push(step.id)
    reasons.push(`${step.title}: ${reason}`)
  }

  return { path: next, completedStepIds, reasons }
}

// ---------------------------------------------------------------------------
// Evidence (canon evidence.ts — records WHY a step cleared)
// ---------------------------------------------------------------------------

export type EvidenceKind =
  | 'manual'
  | 'finance_metric'
  | 'assessment_hard_stop_clear'
  | 'plaid_category'
  | 'partner_sync'

export interface StepEvidence {
  kind: EvidenceKind
  detail: string
  at: string
}

/** Attach evidence onto a step (stored in notes footer). */
export function completeStepWithEvidence(
  path: ReadinessPath,
  stepId: string,
  status: PathStepStatus,
  evidence: StepEvidence,
  now: Date = new Date(),
): ReadinessPath {
  const next = setPathStepStatus(path, stepId, status, now)
  return {
    ...next,
    steps: next.steps.map((s) => {
      if (s.id !== stepId) return s
      const stamp = `[evidence:${evidence.kind}] ${evidence.detail} @ ${evidence.at}`
      const notes = s.notes.includes('[evidence:') ? s.notes : `${s.notes}\n\n${stamp}`
      return {
        ...s,
        notes,
      }
    }),
  }
}

/** Parsed evidence footer from a step's notes (single stamp, first one wins). */
export function parseStepEvidence(notes: string): StepEvidence | null {
  const m = /\[evidence:([a-z_]+)\] ([\s\S]*?) @ (\S+)\s*$/.exec(notes)
  if (!m) return null
  return { kind: m[1] as EvidenceKind, detail: m[2], at: m[3] }
}

/**
 * Auto-complete with explicit evidence kinds from finance / assessment.
 * Finance-metric completions stamp "cleared by your ledger {Mon d}".
 */
export function evidenceBasedAutoComplete(
  path: ReadinessPath,
  result: PathAssessment | null,
  finance: PathFinanceSnapshot | null,
  now: Date = new Date(),
): { path: ReadinessPath; completedStepIds: string[]; reasons: string[] } {
  const base = autoCompletePathFromSignals(path, result, finance, now)
  if (base.completedStepIds.length === 0) return base

  let next = base.path
  for (const id of base.completedStepIds) {
    // Re-apply evidence stamp on already-done steps
    next = {
      ...next,
      steps: next.steps.map((s) => {
        if (s.id !== id) return s
        const stepReason = base.reasons.find((r) => r.startsWith(s.title)) ?? 'Signal cleared'
        const kind: EvidenceKind = /assessment|hard-stop/i.test(stepReason)
          ? 'assessment_hard_stop_clear'
          : 'finance_metric'
        const detail =
          kind === 'finance_metric'
            ? `cleared by your ledger ${ledgerDayStamp(now)}`
            : stepReason.replace(`${s.title}: `, '')
        const stamp = `[evidence:${kind}] ${detail} @ ${now.toISOString()}`
        return {
          ...s,
          notes: s.notes.includes('[evidence:') ? s.notes : `${s.notes}\n\n${stamp}`,
        }
      }),
    }
  }
  return { path: next, completedStepIds: base.completedStepIds, reasons: base.reasons }
}

/** "Aug 5" — short ledger day for the evidence line. */
export function ledgerDayStamp(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ---------------------------------------------------------------------------
// Habit (canon habit.ts — pure stage derivation; analytics once-flags dropped)
// ---------------------------------------------------------------------------

export type PathHabitStage =
  | 'no_path'
  | 'path_pending_first'
  | 'path_in_progress'
  | 'path_complete'
  | 'ready_optional'

/** Coarse stage for funnel dashboards — no free text. */
export function derivePathHabitStage(path: ReadinessPath | null | undefined): PathHabitStage {
  if (!path) return 'no_path'
  if (path.mode === 'ready_optional') return 'ready_optional'
  const steps = path.steps ?? []
  if (steps.length === 0) return 'path_complete'
  const doneOrSkip = steps.filter(
    (s) => (s.status ?? 'pending') === 'done' || (s.status ?? 'pending') === 'skipped',
  ).length
  if (doneOrSkip === 0) return 'path_pending_first'
  if (doneOrSkip >= steps.length) return 'path_complete'
  return 'path_in_progress'
}

export function pathPendingStepCount(path: ReadinessPath | null | undefined): number {
  if (!path?.steps?.length) return 0
  return path.steps.filter((s) => (s.status ?? 'pending') === 'pending').length
}

/** True when path is older than `minDays` and still incomplete (return habit). */
export function isPathReturnVisit(
  path: ReadinessPath | null | undefined,
  minDays = 1,
  nowMs: number = Date.now(),
): boolean {
  if (!path || path.mode === 'ready_optional') return false
  const stage = derivePathHabitStage(path)
  if (stage === 'path_complete' || stage === 'no_path') return false
  const created = Date.parse(path.createdAt)
  if (!Number.isFinite(created)) return false
  return nowMs - created >= minDays * 86_400_000
}

// ---------------------------------------------------------------------------
// Versions (canon versions.ts — capped local history; no server sync)
// ---------------------------------------------------------------------------

const HISTORY_KEY = 'homi:readiness-path-history'
const MAX_VERSIONS = 10

export interface PathVersionRecord {
  savedAt: string
  path: ReadinessPath
}

export function loadPathHistory(): PathVersionRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PathVersionRecord[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((r) => ({
        savedAt: r.savedAt,
        path: normalizeReadinessPath(r.path) as ReadinessPath,
      }))
      .filter((r) => r.path != null)
  } catch {
    return []
  }
}

function saveHistory(records: PathVersionRecord[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, MAX_VERSIONS)))
  } catch {
    /* quota */
  }
}

/** Push current path onto history before overwriting with a new generation. */
export function archivePathVersion(path: ReadinessPath, now = new Date()): void {
  const prev = loadPathHistory()
  const next: PathVersionRecord[] = [
    { savedAt: now.toISOString(), path },
    ...prev.filter((r) => r.path.id !== path.id),
  ].slice(0, MAX_VERSIONS)
  saveHistory(next)
}

export function clearPathHistory(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(HISTORY_KEY)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Local display helpers (app-side; no canon copy invented)
// ---------------------------------------------------------------------------

/**
 * Step notes minus the trailing PATH_DISCLAIMER and any evidence footer —
 * the disclaimer renders once per section instead of repeating per card.
 * The underlying stored notes stay verbatim canon.
 */
export function stepWhyLine(notes: string): string {
  const noEvidence = notes.split('\n\n[evidence:')[0]
  return noEvidence.replace(/\s*Educational readiness only —[\s\S]*$/, '').trim()
}

/** Step content signature — "did regeneration alter the steps?" */
export function pathStepsSignature(path: ReadinessPath | null): string {
  if (!path) return ''
  return `${path.verdict}|${path.mode}|${path.steps.map((s) => `${s.reasonCode}:${s.title}`).join('>')}`
}

/** Carry completion state across a regeneration, matched by content key. */
export function mergeStepStatuses(
  fresh: ReadinessPath,
  prev: ReadinessPath | null,
): ReadinessPath {
  if (!prev) return fresh
  return {
    ...fresh,
    steps: fresh.steps.map((s) => {
      const prior = prev.steps.find(
        (p) => p.reasonCode === s.reasonCode && p.title === s.title && p.status !== 'pending',
      )
      if (!prior) return s
      return {
        ...s,
        status: prior.status,
        completedAt: prior.completedAt,
        // keep the prior notes when they carry an evidence footer
        notes: prior.notes.includes('[evidence:') ? prior.notes : s.notes,
      }
    }),
  }
}
