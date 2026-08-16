/* ------------------------------------------------------------------ */
/* HōMI Signals Engine — port of GitHub canon lib/signals/engine.ts     */
/* (source of truth). Copy verbatim; only the data shapes are adapted. */
/*                                                                     */
/* Derives a short list of proactive, informational signals from a     */
/* stored assessment and recent daily check-ins. Pure module.          */
/*                                                                     */
/* Local adaptations:                                                  */
/*  - canon StoredAssessment → local StoredAssessment built from our   */
/*    readiness store (live ScoreResult + manual inputs + completedAt) */
/*  - canon DailyCheckin → minimal local equivalent (financial_stress);*/
/*    this app has no check-in surface yet, so callers pass []         */
/*  - canon hardcodes pillar maxes 35/35/30 — here PILLAR_MAX_POINTS   */
/*  - canon deep links adapted to this app's routes (/plan →           */
/*    /buildpath, /tools → /readiness, /results → /readiness;          */
/*    /assessment and /daily kept as canon)                            */
/* ------------------------------------------------------------------ */

import type { ScoreResult } from '@/lib/score'
import { HARD_STOP_MESSAGES, PILLAR_MAX_POINTS } from '@/lib/score'
import { deriveConflictSignals } from '@/lib/conflict'
import type { ConflictSeverity } from '@/lib/conflict'

export type SignalSeverity = 'crimson' | 'amber' | 'yellow' | 'cyan' | 'emerald'

export interface Signal {
  id: string
  severity: SignalSeverity
  title: string
  body: string
  actionLabel: string
  actionHref: string
}

/** Local equivalent of canon lib/assessment/storage StoredAssessment. */
export interface StoredAssessment {
  result: ScoreResult
  inputs: {
    fomoLevel: number
    timeHorizonMonths: number
    referralSource?: string
    deadlineOrigin?: string
  }
  /** ISO timestamp of when this assessment state was produced. */
  completedAt: string
}

/** Local minimal equivalent of canon DailyCheckin (this app has none yet). */
export interface DailyCheckin {
  financial_stress: number
}

export interface SignalEngineInput {
  storedAssessment: StoredAssessment | null
  /** Last 14 daily_checkins, newest first. Empty if none exist. */
  recentCheckins: DailyCheckin[]
}

const SEVERITY_PRIORITY: Record<SignalSeverity, number> = {
  crimson: 0,
  amber: 1,
  yellow: 2,
  cyan: 3,
  emerald: 4,
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function hardStopSignal(storedAssessment: StoredAssessment): Signal | null {
  const hardStops = storedAssessment.result.hardStops
  if (hardStops.length === 0) return null
  const first = hardStops[0]
  const countLabel = hardStops.length === 1 ? 'One hard-stop is' : `${hardStops.length} hard-stops are`
  return {
    id: 'hard-stop-active',
    severity: 'crimson',
    title: `${countLabel} active`,
    body: `${HARD_STOP_MESSAGES[first]} Not yet is not no. It is clarity. It is protection — and it's worth addressing before anything else.`,
    actionLabel: 'Review your plan',
    actionHref: '/buildpath',
  }
}

function weakPillarSignals(storedAssessment: StoredAssessment): Signal[] {
  const { financial, emotional, timing } = storedAssessment.result.pillars
  const pillars: { key: string; label: string; score: number; max: number }[] = [
    { key: 'financial', label: 'Financial Reality', score: financial.total, max: PILLAR_MAX_POINTS.financial },
    { key: 'emotional', label: 'Emotional Truth', score: emotional.total, max: PILLAR_MAX_POINTS.emotional },
    { key: 'timing', label: 'Perfect Timing', score: timing.total, max: PILLAR_MAX_POINTS.timing },
  ]

  const signals: Signal[] = []
  for (const pillar of pillars) {
    const pct = pillar.score / pillar.max
    if (pct < 0.6) {
      signals.push({
        id: `weak-pillar-${pillar.key}`,
        severity: 'amber',
        title: `${pillar.label} is below where it needs to be`,
        body: `${pillar.label} is sitting at ${Math.round(pct * 100)}% of its max. That's the clearest gap in your plan right now, and the most useful place to focus next.`,
        actionLabel: 'See your plan',
        actionHref: '/buildpath',
      })
    }
  }
  return signals
}

function pressureSignal(storedAssessment: StoredAssessment): Signal | null {
  if (storedAssessment.inputs.fomoLevel >= 8) {
    return {
      id: 'pressure-signal',
      severity: 'amber',
      title: 'External pressure is running high',
      body: "You reported a high level of outside pressure or FOMO. Pressure that isn't yours is one of the more reliable predictors of a decision you'll second-guess later — worth talking through before it does the deciding for you.",
      actionLabel: 'Talk it through',
      actionHref: '/readiness',
    }
  }
  return null
}

const CONFLICT_SEVERITY_MAP: Record<ConflictSeverity, SignalSeverity> = {
  protect: 'crimson',
  warn: 'amber',
  info: 'cyan',
}

/**
 * Surfaces lib/conflict signals (herd pressure, manufactured urgency,
 * commission exposure, external deadlines) when the stored assessment's
 * inputs carry the optional referralSource/deadlineOrigin fields.
 * Purely informational — never affects score or verdict.
 */
function conflictSignalsFrom(storedAssessment: StoredAssessment): Signal[] {
  const { fomoLevel, timeHorizonMonths, referralSource, deadlineOrigin } =
    storedAssessment.inputs
  if (referralSource === undefined && deadlineOrigin === undefined) return []

  return deriveConflictSignals({ fomoLevel, timeHorizonMonths, referralSource, deadlineOrigin }).map(
    (signal) => ({
      id: `conflict-${signal.code.toLowerCase()}`,
      severity: CONFLICT_SEVERITY_MAP[signal.severity],
      title: signal.title,
      body: signal.message,
      actionLabel: 'See conflict check',
      actionHref: '/readiness',
    }),
  )
}

function risingStressSignal(recentCheckins: DailyCheckin[]): Signal | null {
  if (recentCheckins.length < 4) return null

  // Newest first -> take most recent 4, reverse to chronological order.
  const recentFour = recentCheckins.slice(0, 4)
  const chronological = [...recentFour].reverse()

  let nonDecreasing = true
  let sawIncrease = false
  for (let i = 1; i < chronological.length; i++) {
    const prev = chronological[i - 1].financial_stress
    const curr = chronological[i].financial_stress
    if (curr < prev) {
      nonDecreasing = false
      break
    }
    if (curr > prev) sawIncrease = true
  }

  if (nonDecreasing && sawIncrease) {
    return {
      id: 'rising-stress',
      severity: 'yellow',
      title: 'Financial stress has been trending up',
      body: "Your recent check-ins show financial stress climbing over the last several days. Worth a quick look at what's driving it before it becomes the whole picture.",
      actionLabel: 'Check in today',
      actionHref: '/daily',
    }
  }
  return null
}

function staleAssessmentSignal(storedAssessment: StoredAssessment): Signal | null {
  const completedAt = new Date(storedAssessment.completedAt).getTime()
  if (Number.isNaN(completedAt)) return null
  if (Date.now() - completedAt > THIRTY_DAYS_MS) {
    return {
      id: 'stale-assessment',
      severity: 'cyan',
      title: 'Your assessment is more than 30 days old',
      body: 'Numbers move. A quick retake makes sure your plan still reflects where you actually stand today, not where you stood a month ago.',
      actionLabel: 'Retake assessment',
      actionHref: '/assessment',
    }
  }
  return null
}

function allClearSignal(storedAssessment: StoredAssessment): Signal | null {
  const noHardStops = storedAssessment.result.hardStops.length === 0
  const goodVerdict =
    storedAssessment.result.verdict === 'READY' ||
    storedAssessment.result.verdict === 'ALMOST_THERE'
  if (noHardStops && goodVerdict) {
    return {
      id: 'all-clear',
      severity: 'emerald',
      title: 'Nothing urgent right now',
      body: 'No hard-stops, no rising pressure, and your last assessment is holding up. This is what steady readiness looks like — keep an eye on your plan and check in when something changes.',
      actionLabel: 'View your plan',
      actionHref: '/buildpath',
    }
  }
  return null
}

export function deriveSignals(input: SignalEngineInput): Signal[] {
  const { storedAssessment, recentCheckins } = input
  const signals: Signal[] = []

  if (storedAssessment) {
    const hardStop = hardStopSignal(storedAssessment)
    if (hardStop) signals.push(hardStop)

    signals.push(...weakPillarSignals(storedAssessment))

    const pressure = pressureSignal(storedAssessment)
    if (pressure) signals.push(pressure)

    signals.push(...conflictSignalsFrom(storedAssessment))
  }

  const risingStress = risingStressSignal(recentCheckins)
  if (risingStress) signals.push(risingStress)

  if (storedAssessment) {
    const stale = staleAssessmentSignal(storedAssessment)
    if (stale) signals.push(stale)
  }

  if (storedAssessment && signals.length === 0) {
    const allClear = allClearSignal(storedAssessment)
    if (allClear) signals.push(allClear)
  }

  return signals.sort((a, b) => SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity])
}

/* -------- local shape adapters -------- */

/**
 * Build the local StoredAssessment from our readiness store state:
 * the live ScoreResult, the manual inputs, and the last re-check
 * timestamp (or now, when no snapshot exists yet).
 */
export function storedAssessmentFrom(
  result: ScoreResult,
  inputs: { fomoLevel: number; timeHorizonMonths: number },
  lastSnapshotAt?: string,
): StoredAssessment {
  return {
    result,
    inputs: { fomoLevel: inputs.fomoLevel, timeHorizonMonths: inputs.timeHorizonMonths },
    completedAt: lastSnapshotAt ?? new Date().toISOString(),
  }
}
