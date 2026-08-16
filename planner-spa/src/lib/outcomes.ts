/* ------------------------------------------------------------------ */
/* Outcomes — local port of canon lib/outcomes.                        */
/*                                                                     */
/* Two layers, kept strictly separate:                                 */
/*  1. The readiness-dividend FRAMEWORK (canon calibration.ts, ported  */
/*     verbatim) — cohort aggregates that need anonymized outcome      */
/*     surveys from a backend this local-only build does not have.     */
/*     The functions are here for the future server build; the UI      */
/*     renders the framework honestly and never invents a number.      */
/*  2. The LOCAL dividend — the user's own re-check trajectory,        */
/*     computed from on-device score history. Real data, no cohort     */
/*     statistics.                                                     */
/* Plus the survey-nudge eligibility predicate (canon survey-nudge.ts, */
/* pure port for future use — no UI yet).                              */
/* ------------------------------------------------------------------ */

import type { VerdictKey } from '@/lib/score'
import { VERDICT_META } from '@/lib/score'
import { scoreBand } from '@/lib/receipts'
import type { ScoreBand } from '@/lib/receipts'

/* ================================================================== */
/* 1. Calibration framework (verbatim port of canon calibration.ts)    */
/* ================================================================== */

export interface CalibrationRow {
  verdict: VerdictKey
  response_count: number
  avg_satisfaction: number // 1–5
  positive_rate: number // 0–1
}

const VERDICT_ORDER: VerdictKey[] = ['READY', 'ALMOST_THERE', 'BUILD_FIRST', 'NOT_YET']

/** Normalize raw RPC rows into a fixed-order, typed list (missing verdicts → zeroed). */
export function shapeCalibration(raw: Partial<CalibrationRow>[] | null): CalibrationRow[] {
  const byVerdict = new Map<string, Partial<CalibrationRow>>()
  for (const r of raw ?? []) {
    if (r.verdict) byVerdict.set(r.verdict, r)
  }
  return VERDICT_ORDER.map((verdict) => {
    const r = byVerdict.get(verdict)
    return {
      verdict,
      response_count: Number(r?.response_count ?? 0),
      avg_satisfaction: Number(r?.avg_satisfaction ?? 0),
      positive_rate: Number(r?.positive_rate ?? 0),
    }
  })
}

/** Total completed outcome surveys behind the calibration. */
export function totalResponses(rows: CalibrationRow[]): number {
  return rows.reduce((sum, r) => sum + r.response_count, 0)
}

/**
 * The headline: how the people the compass told to WAIT (NOT_YET / BUILD_FIRST)
 * fared versus the people it cleared (READY). Returns null until both cohorts
 * have enough responses to be meaningful (guards against noise on tiny N).
 */
export function readinessDividend(
  rows: CalibrationRow[],
  minCohort = 5,
): {
  readyAvg: number
  waitedAvg: number
  deltaPct: number
  readyPositive: number
  waitedPositive: number
} | null {
  const ready = rows.find((r) => r.verdict === 'READY')
  const waited = rows.filter((r) => r.verdict === 'NOT_YET' || r.verdict === 'BUILD_FIRST')
  const waitedCount = waited.reduce((s, r) => s + r.response_count, 0)
  if (!ready || ready.response_count < minCohort || waitedCount < minCohort) return null

  const waitedAvg =
    waited.reduce((s, r) => s + r.avg_satisfaction * r.response_count, 0) / waitedCount
  const waitedPositive =
    waited.reduce((s, r) => s + r.positive_rate * r.response_count, 0) / waitedCount

  const deltaPct = waitedAvg > 0 ? ((ready.avg_satisfaction - waitedAvg) / waitedAvg) * 100 : 0

  return {
    readyAvg: ready.avg_satisfaction,
    waitedAvg,
    deltaPct,
    readyPositive: ready.positive_rate,
    waitedPositive,
  }
}

export function verdictLabel(v: VerdictKey): string {
  return VERDICT_META[v].label
}

/* ================================================================== */
/* 2. Local dividend — the user's own re-check trajectory              */
/* ================================================================== */

/** Minimal structural shape of a score-history snapshot (store/readiness). */
export interface ScorePoint {
  at: string // ISO timestamp
  score: number
  verdict: VerdictKey
}

export interface LocalDividend {
  checks: number
  first: ScorePoint
  latest: ScorePoint
  /** latest.score − first.score, signed. */
  delta: number
  firstBand: ScoreBand
  latestBand: ScoreBand
  bandMovement: 'up' | 'same' | 'down'
}

const BAND_RANK: Record<ScoreBand, number> = { early: 0, emerging: 1, moderate: 2, high: 3 }

/**
 * The user's own dividend so far: first re-check vs latest. Returns null
 * until at least two snapshots exist — one point is a position, not a
 * trajectory. All numbers come from this device's own history; nothing
 * is estimated or aggregated.
 */
export function localDividend(history: ScorePoint[]): LocalDividend | null {
  const clean = history.filter(
    (p) =>
      p &&
      typeof p.at === 'string' &&
      !Number.isNaN(Date.parse(p.at)) &&
      typeof p.score === 'number' &&
      Number.isFinite(p.score),
  )
  if (clean.length < 2) return null
  const first = clean[0]
  const latest = clean[clean.length - 1]
  const firstBand = scoreBand(first.score)
  const latestBand = scoreBand(latest.score)
  const bandMovement =
    BAND_RANK[latestBand] > BAND_RANK[firstBand]
      ? 'up'
      : BAND_RANK[latestBand] < BAND_RANK[firstBand]
        ? 'down'
        : 'same'
  return {
    checks: clean.length,
    first,
    latest,
    delta: Math.round((latest.score - first.score) * 10) / 10,
    firstBand,
    latestBand,
    bandMovement,
  }
}

/* ================================================================== */
/* 3. Survey-nudge eligibility (verbatim port of canon survey-nudge.ts) */
/*    Pure exports for future use — no UI consumes these yet.          */
/* ================================================================== */

export type SurveyKind = 'day30' | 'day90' | 'day365'

export interface DueSurveyRow {
  id: string
  user_id: string
  kind: SurveyKind
  due_at: string
  completed_at: string | null
  notified_at: string | null
}

const KIND_DAYS: Record<SurveyKind, number> = { day30: 30, day90: 90, day365: 365 }

/** Notification copy per checkpoint. Honest, no-judgment tone (brand canon). */
export function surveyNudgeCopy(kind: SurveyKind): { title: string; body: string } {
  const days = KIND_DAYS[kind]
  return {
    title: 'A quick outcome check-in',
    body: `It's been about ${days} days since your decision. A 30-second, no-judgment read on how it's actually going — either way is useful.`,
  }
}

/** Deep-link target for a due survey. The dashboard renders the prompt. */
export const SURVEY_NUDGE_PATH = '/dashboard'

/**
 * A survey is nudge-eligible when it's due, not completed, and not already
 * notified. Pure predicate so the cron and tests agree on the rule.
 */
export function isNudgeEligible(row: DueSurveyRow, now: Date = new Date()): boolean {
  if (row.completed_at) return false
  if (row.notified_at) return false
  const due = new Date(row.due_at).getTime()
  if (Number.isNaN(due)) return false
  return due <= now.getTime()
}

/**
 * Collapse many due rows to at most one nudge per user (the earliest-due,
 * so the oldest checkpoint wins). Prevents emailing a user several times in
 * one cron pass when checkpoints for different decisions land together.
 */
export function pickOnePerUser(rows: DueSurveyRow[], now: Date = new Date()): DueSurveyRow[] {
  const byUser = new Map<string, DueSurveyRow>()
  for (const row of rows) {
    if (!isNudgeEligible(row, now)) continue
    const existing = byUser.get(row.user_id)
    if (!existing || new Date(row.due_at) < new Date(existing.due_at)) {
      byUser.set(row.user_id, row)
    }
  }
  return [...byUser.values()]
}
