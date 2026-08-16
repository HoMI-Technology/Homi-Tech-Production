/**
 * Decision Pre-Flight — VERBATIM-adapted port of canon lib/readiness/preflight.ts.
 * 60-second gate before a big commitment. Educational only. Uses scoring
 * hard-stop logic + simple cash/FOMO checks. All copy verbatim canon.
 *
 * ADAPTATION: canon accepts AssessmentInputs/AssessmentResult from its scorer;
 * here we consume the already-computed `PathAssessment` (from
 * `assessmentFromScore(result)` in `@/lib/path`) plus live ledger numbers.
 * The "score fresh inputs" branch is dropped — our ScoreResult is always live.
 */

import type { HardStopKey, VerdictKey } from '@/lib/score'
import type { PathAssessment } from '@/lib/path'

export type PreflightSignal =
  | 'HARD_STOP'
  | 'THIN_RUNWAY'
  | 'HIGH_DTI'
  | 'HIGH_HOUSING'
  | 'LOW_CREDIT'
  | 'EXTERNAL_PRESSURE'
  | 'PARTNER_GAP'
  | 'NEGATIVE_CASHFLOW'
  | 'OK'

export type PreflightVerdict = 'PROCEED_WITH_CARE' | 'WAIT' | 'DO_NOT_PROCEED'

export interface PreflightInput {
  /** Latest assessment result (live from the scoring engine). */
  assessmentResult?: PathAssessment | null
  monthlyIncome?: number | null
  monthlyExpenses?: number | null
  monthlyDebtPayments?: number | null
  liquidSavings?: number | null
  /** Self-reported pressure 1–10 (10 = high FOMO). */
  externalPressure?: number | null
  /** Partner alignment 1–10 if applicable. */
  partnerAlignment?: number | null
}

export interface PreflightFinding {
  signal: PreflightSignal
  severity: 'block' | 'warn' | 'ok'
  title: string
  detail: string
}

export interface PreflightResult {
  verdict: PreflightVerdict
  badge: string
  findings: PreflightFinding[]
  score: number | null
  assessmentVerdict: VerdictKey | null
  hardStopCodes: HardStopKey[]
  disclaimer: string
}

export const PREFLIGHT_DISCLAIMER =
  'Educational readiness check only — not a commitment to lend, credit approval, ' +
  'or financial advice. Re-run the full assessment before irreversible moves.'

function cashFlow(
  income: number | null | undefined,
  expenses: number | null | undefined,
  debt: number | null | undefined,
): number | null {
  if (income == null || expenses == null) return null
  return income - expenses - (debt ?? 0)
}

function runwayMonths(
  liquid: number | null | undefined,
  expenses: number | null | undefined,
  debt: number | null | undefined,
): number | null {
  if (liquid == null || expenses == null) return null
  const out = expenses + (debt ?? 0)
  if (out <= 0) return Infinity
  return liquid / out
}

/**
 * Run pre-flight gates. Prefer assessmentResult when available.
 */
export function runPreflight(input: PreflightInput): PreflightResult {
  const findings: PreflightFinding[] = []
  let score: number | null = null
  let assessmentVerdict: VerdictKey | null = null
  let hardStopCodes: HardStopKey[] = []

  if (input.assessmentResult) {
    score = input.assessmentResult.score
    assessmentVerdict = input.assessmentResult.verdict
    hardStopCodes = input.assessmentResult.hardStops.map((h) => h.code)
    for (const stop of input.assessmentResult.hardStops) {
      findings.push({
        signal: 'HARD_STOP',
        severity: 'block',
        title: 'Protective hard-stop active',
        detail: stop.message,
      })
    }
  }

  const flow = cashFlow(input.monthlyIncome, input.monthlyExpenses, input.monthlyDebtPayments)
  if (flow != null && flow < 0) {
    findings.push({
      signal: 'NEGATIVE_CASHFLOW',
      severity: 'block',
      title: 'Negative monthly cash flow',
      detail: `You're short ~$${Math.abs(Math.round(flow)).toLocaleString('en-US')} each month before this decision.`,
    })
  }

  const runway = runwayMonths(input.liquidSavings, input.monthlyExpenses, input.monthlyDebtPayments)
  if (runway != null && Number.isFinite(runway) && runway < 1) {
    findings.push({
      signal: 'THIN_RUNWAY',
      severity: 'block',
      title: 'Runway under 1 month',
      detail: `Liquid savings cover ~${runway.toFixed(1)} months of outflow.`,
    })
  } else if (runway != null && Number.isFinite(runway) && runway < 3) {
    findings.push({
      signal: 'THIN_RUNWAY',
      severity: 'warn',
      title: 'Thin emergency runway',
      detail: `Only ~${runway.toFixed(1)} months of runway — a shock could force bad timing.`,
    })
  }

  if (
    input.monthlyIncome != null &&
    input.monthlyIncome > 0 &&
    input.monthlyDebtPayments != null
  ) {
    const dti = (input.monthlyDebtPayments / input.monthlyIncome) * 100
    if (dti > 50) {
      findings.push({
        signal: 'HIGH_DTI',
        severity: 'block',
        title: 'Debt-to-income above 50%',
        detail: `DTI ~${dti.toFixed(0)}% — protective line is 50%.`,
      })
    } else if (dti > 43) {
      findings.push({
        signal: 'HIGH_DTI',
        severity: 'warn',
        title: 'Elevated debt-to-income',
        detail: `DTI ~${dti.toFixed(0)}% — stretch territory for most housing decisions.`,
      })
    }
  }

  if (input.externalPressure != null && input.externalPressure >= 8) {
    findings.push({
      signal: 'EXTERNAL_PRESSURE',
      severity: 'warn',
      title: 'High external pressure',
      detail: "Urgency may be someone else's timeline. Give the decision quiet days.",
    })
  }

  if (input.partnerAlignment != null && input.partnerAlignment <= 4) {
    findings.push({
      signal: 'PARTNER_GAP',
      severity: 'warn',
      title: 'Partner alignment is low',
      detail:
        'Household disagreement on a big purchase is a readiness gap, not a scheduling issue.',
    })
  }

  if (findings.length === 0) {
    findings.push({
      signal: 'OK',
      severity: 'ok',
      title: 'No hard red flags in this quick check',
      detail:
        'Still educational only — run the full assessment and Path to Ready before treating this as clear.',
    })
  }

  const hasBlock = findings.some((f) => f.severity === 'block')
  const hasWarn = findings.some((f) => f.severity === 'warn')

  let verdict: PreflightVerdict
  let badge: string
  if (hasBlock || assessmentVerdict === 'NOT_YET') {
    verdict = 'DO_NOT_PROCEED'
    badge = 'DO NOT PROCEED'
  } else if (
    hasWarn ||
    assessmentVerdict === 'BUILD_FIRST' ||
    assessmentVerdict === 'ALMOST_THERE'
  ) {
    verdict = 'WAIT'
    badge = 'WAIT / BUILD FIRST'
  } else {
    verdict = 'PROCEED_WITH_CARE'
    badge = 'PROCEED WITH CARE'
  }

  return {
    verdict,
    badge,
    findings,
    score,
    assessmentVerdict,
    hardStopCodes,
    disclaimer: PREFLIGHT_DISCLAIMER,
  }
}
