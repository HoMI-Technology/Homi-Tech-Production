/* ------------------------------------------------------------------ */
/* Score bridge — live planner numbers → AssessmentInputs → HōMI-Score */
/*                                                                     */
/* Ported from the reference planner score-bridge.ts (lib audit #2:    */
/* PORT, wave 1), adapted to OUR canon engine:                         */
/*   - buildAssessmentInputs returns @/lib/score AssessmentInputs      */
/*     (the reference's scoring.ts was SKIP — numerics identical, but  */
/*     scorer-owns-truth lives in @/lib/score).                        */
/*   - scoreFromBudget returns OUR ScoreResult (pillars / hardStops:   */
/*     HardStopKey[] / warnings: WarningKey[]).                        */
/*   - PlannerScore is the small view type downstream surfaces need:   */
/*     score, verdict, 0–100 pillar percentages, hard-stops, and the   */
/*     canon key-insight / next-steps copy from @/lib/insights.        */
/* ------------------------------------------------------------------ */

import { estimateHousingPayment } from '@/lib/planner/cfm'
import { computeScore } from '@/lib/score'
import type {
  AssessmentInputs,
  HardStopKey,
  PillarKey,
  ScoreResult,
  VerdictKey,
  WarningKey,
} from '@/lib/score'
import { PILLAR_MAX_POINTS } from '@/lib/score'
import { generateKeyInsight, generateNextSteps } from '@/lib/insights'
import type {
  BankAccount,
  Bill,
  DebtItem,
  Holding,
  HouseholdPartner,
  NetWorthItem,
  ReadinessProfile,
  SavingsGoal,
  Transaction,
} from '@/lib/planner/types'
import {
  DEFAULT_GOAL,
  DEFAULT_READINESS_PROFILE,
  financialReality,
  summarizePortfolio,
  totalNetWorth,
} from '@/lib/planner/derived'

export interface ScoreBridgeInput {
  transactions: Transaction[]
  accounts: BankAccount[]
  bills: Bill[]
  holdings: Holding[]
  netWorthItems: NetWorthItem[]
  savingsGoal: SavingsGoal
  readinessProfile: ReadinessProfile
  debts?: DebtItem[]
}

function safeProfile(p?: Partial<ReadinessProfile> | null): ReadinessProfile {
  return { ...DEFAULT_READINESS_PROFILE, ...(p && typeof p === 'object' ? p : {}) }
}

export function buildAssessmentInputs(
  input: ScoreBridgeInput,
  overrides?: Partial<AssessmentInputs> & {
    incomeMultiplier?: number
  },
): AssessmentInputs {
  const reality = financialReality(
    input.transactions ?? [],
    input.accounts ?? [],
    input.bills ?? [],
  )
  const p = safeProfile(input.readinessProfile)
  const income = reality.income * (overrides?.incomeMultiplier ?? 1)
  const dtiRatio =
    income > 0 ? reality.debtPayments / income : reality.dti / 100

  const downNeeded = p.targetHomePrice * 0.2
  const dpProgress =
    downNeeded > 0
      ? Math.min(1, p.downPaymentSaved / downNeeded)
      : p.downPaymentSaved > 0
        ? 1
        : 0
  const downPaymentPercent =
    p.targetHomePrice > 0 ? p.downPaymentSaved / p.targetHomePrice : 0

  const housingPayment = estimateHousingPayment({
    targetPrice: p.targetHomePrice,
    downPaymentSaved: p.downPaymentSaved,
    ratePct: p.assumedRatePct,
    termYears: p.termYears,
    taxInsuranceRatePct: p.taxInsuranceRatePct,
    hoaMonthly: p.hoaMonthly,
  })
  const monthlyHousingRatio =
    income > 0 ? housingPayment / income : undefined

  const runway = Number.isFinite(reality.runwayMonths)
    ? reality.runwayMonths
    : /* imputed: infinite runway coerced to 12 for scoring — labeled per canon completeness doctrine */
      12

  return {
    debtToIncomeRatio: overrides?.debtToIncomeRatio ?? dtiRatio,
    downPaymentPercent: overrides?.downPaymentPercent ?? downPaymentPercent,
    emergencyFundMonths: overrides?.emergencyFundMonths ?? runway,
    creditScore: overrides?.creditScore ?? p.creditScore,
    lifeStability: overrides?.lifeStability ?? p.lifeStability,
    confidenceLevel: overrides?.confidenceLevel ?? p.confidenceLevel,
    partnerAlignment:
      overrides?.partnerAlignment !== undefined
        ? overrides.partnerAlignment
        : p.partnerAlignment,
    fomoLevel: overrides?.fomoLevel ?? p.fomoLevel,
    timeHorizonMonths: overrides?.timeHorizonMonths ?? p.timeHorizonMonths,
    savingsRate: overrides?.savingsRate ?? reality.savingsRate / 100,
    downPaymentProgress: overrides?.downPaymentProgress ?? dpProgress,
    monthlyHousingRatio:
      overrides?.monthlyHousingRatio ?? monthlyHousingRatio,
  }
}

export function scoreFromBudget(input: ScoreBridgeInput): ScoreResult {
  try {
    return computeScore(buildAssessmentInputs(input))
  } catch {
    // Never blank the whole app if a score input is bad
    return computeScore(
      buildAssessmentInputs({
        ...input,
        readinessProfile: DEFAULT_READINESS_PROFILE,
        transactions: input.transactions ?? [],
        accounts: input.accounts ?? [],
        bills: input.bills ?? [],
        holdings: input.holdings ?? [],
        netWorthItems: input.netWorthItems ?? [],
        savingsGoal: input.savingsGoal ?? { ...DEFAULT_GOAL },
      }),
    )
  }
}

export function scoreHouseholdMember(
  input: ScoreBridgeInput,
  partner: HouseholdPartner,
  role: 'primary' | 'partner',
): ScoreResult {
  if (role === 'primary') {
    return computeScore(
      buildAssessmentInputs(input, {
        partnerAlignment: partner.enabled
          ? partner.partnerAlignment
          : safeProfile(input.readinessProfile).partnerAlignment,
      }),
    )
  }

  const share = Math.min(0.9, Math.max(0.1, partner.incomeShare || 0.4))
  const primaryShare = 1 - share
  return computeScore(
    buildAssessmentInputs(input, {
      incomeMultiplier: share / Math.max(primaryShare, 0.15),
      creditScore: partner.creditScore,
      lifeStability: partner.lifeStability,
      confidenceLevel: partner.confidenceLevel,
      fomoLevel: partner.fomoLevel,
      timeHorizonMonths: partner.timeHorizonMonths,
      partnerAlignment: partner.partnerAlignment,
    }),
  )
}

export function wealthSnapshot(input: ScoreBridgeInput) {
  const portfolio = summarizePortfolio(input.holdings ?? [])
  const nw = totalNetWorth(
    input.accounts ?? [],
    input.holdings ?? [],
    input.netWorthItems ?? [],
  )
  return { portfolio, nw }
}

/* ------------------------------------------------------------------ */
/* PlannerScore — the small view type downstream surfaces consume.     */
/* Derived from OUR ScoreResult; pillar strength is normalized 0–100   */
/* (matching @/lib/insights normalizedPillars rounding).               */
/* ------------------------------------------------------------------ */

export interface PlannerScore {
  score: number
  verdict: VerdictKey
  /** Pillar strength normalized 0–100 (35/35/30 pts behind). */
  pillarPct: Record<PillarKey, number>
  hardStops: HardStopKey[]
  warnings: WarningKey[]
  keyInsight: string
  nextSteps: string[]
  /** The raw engine result, for anything the view doesn't project. */
  result: ScoreResult
}

export function toPlannerScore(
  result: ScoreResult,
  opts?: { singleRedistribution?: boolean },
): PlannerScore {
  return {
    score: result.score,
    verdict: result.verdict,
    pillarPct: {
      financial: Math.round(
        (result.pillars.financial.total / PILLAR_MAX_POINTS.financial) * 100,
      ),
      emotional: Math.round(
        (result.pillars.emotional.total / PILLAR_MAX_POINTS.emotional) * 100,
      ),
      timing: Math.round(
        (result.pillars.timing.total / PILLAR_MAX_POINTS.timing) * 100,
      ),
    },
    hardStops: result.hardStops,
    warnings: result.warnings,
    keyInsight: generateKeyInsight(result),
    nextSteps: generateNextSteps(result, opts),
    result,
  }
}
