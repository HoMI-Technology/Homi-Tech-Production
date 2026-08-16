/* ------------------------------------------------------------------ */
/* Stress signal algorithms for daily financial check-ins.             */
/*                                                                     */
/* Verbatim-adapted port of the reference planner's stress.ts — the   */
/* composite index weights, classification thresholds, and protective */
/* zero-shame copy are the owner's voice and are carried over exactly. */
/* Pure module: no store imports, no clock reads (check-in dates are   */
/* plain ISO strings, sorted lexically).                               */
/*                                                                     */
/* Design goals (protective honesty, not guilt):                       */
/* - Detect real change: slope, level, volatility, sustained elevation */
/* - Prefer multi-day evidence over single-day spikes                  */
/* - Produce actionable severity + a human reason code                 */
/* - Never shame — name the pattern, suggest one next move             */
/* ------------------------------------------------------------------ */

import type { DailyCheckin } from '@/lib/planner/types'

export type StressTrend =
  | 'rising'
  | 'falling'
  | 'volatile'
  | 'elevated'
  | 'steady'
  | 'insufficient'

export type StressReasonCode =
  | 'slope_up'
  | 'slope_down'
  | 'high_level'
  | 'sustained_high'
  | 'volatility'
  | 'spike'
  | 'recovery'
  | 'steady_ok'
  | 'insufficient'

export type StressSeverity = 'crimson' | 'amber' | 'yellow' | 'cyan' | 'emerald'

export interface StressAnalysis {
  /** Linear slope of stress over recent window (pts/day). Positive = rising. */
  slope: number
  /** Mean stress in the analysis window. */
  mean: number
  /** Sample standard deviation. */
  volatility: number
  /** Latest check-in stress (1–10). */
  latest: number | null
  /** Prior check-in stress when available. */
  previous: number | null
  /** Days in window used. */
  sampleSize: number
  /** Consecutive days at or above 7 (from most recent backwards). */
  streakHigh: number
  /** Consecutive days at or below 3. */
  streakCalm: number
  /** Composite 0–100 stress index (higher = more concern). */
  index: number
  trend: StressTrend
  reasonCode: StressReasonCode
  /** Short operator-facing label */
  label: string
  /** Protective body copy */
  narrative: string
  /** Suggested micro-action */
  nudge: string
  /** Signal severity recommendation */
  severity: StressSeverity
  /** True when something should surface as a signal */
  shouldSignal: boolean
}

function linearSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  // x = 0..n-1
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
    sumXY += i * values[i]
    sumXX += i * i
  }
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return 0
  return (n * sumXY - sumX * sumY) / denom
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const v =
    values.reduce((acc, x) => acc + (x - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(v)
}

/**
 * Analyze check-ins with a multi-factor stress algorithm.
 * Window: last 7 entries (or fewer if sparse).
 */
export function analyzeStress(checkins: DailyCheckin[]): StressAnalysis {
  const sorted = [...(checkins ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  const window = sorted.slice(-7)
  const values = window.map((c) => c.financialStress)

  if (values.length === 0) {
    return {
      slope: 0,
      mean: 0,
      volatility: 0,
      latest: null,
      previous: null,
      sampleSize: 0,
      streakHigh: 0,
      streakCalm: 0,
      index: 0,
      trend: 'insufficient',
      reasonCode: 'insufficient',
      label: 'No check-ins yet',
      narrative:
        'One honest score a day is enough. No judgment — just a signal when the pattern changes.',
      nudge: 'Log today’s financial stress (1 calm · 10 overwhelmed).',
      severity: 'cyan',
      shouldSignal: false,
    }
  }

  const slope = linearSlope(values)
  const m = mean(values)
  const vol = stdev(values)
  const latest = values[values.length - 1]
  const previous = values.length > 1 ? values[values.length - 2] : null

  let streakHigh = 0
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] >= 7) streakHigh++
    else break
  }
  let streakCalm = 0
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] <= 3) streakCalm++
    else break
  }

  // Composite index: level 40% + slope 30% + volatility 15% + streak 15%
  const levelTerm = (m / 10) * 40
  const slopeTerm = Math.min(1, Math.max(0, (slope + 0.2) / 1.2)) * 30
  const volTerm = Math.min(1, vol / 2.5) * 15
  const streakTerm = Math.min(1, streakHigh / 4) * 15
  const index = Math.round(
    Math.min(100, Math.max(0, levelTerm + slopeTerm + volTerm + streakTerm)),
  )

  // Day-over-day spike
  const spike = previous != null && latest - previous >= 3 && latest >= 6

  // Classification priority (protective, most urgent first)
  let trend: StressTrend
  let reasonCode: StressReasonCode
  let severity: StressAnalysis['severity']
  let label: string
  let narrative: string
  let nudge: string
  let shouldSignal = true

  if (values.length < 3) {
    trend = 'insufficient'
    reasonCode = 'insufficient'
    severity = 'cyan'
    label = 'Building a stress baseline'
    narrative = `You have ${values.length} check-in${values.length === 1 ? '' : 's'}. Three days unlocks trend detection.`
    nudge = 'Check in again tomorrow — patterns need a few points.'
    shouldSignal = false
  } else if (streakHigh >= 3) {
    trend = 'elevated'
    reasonCode = 'sustained_high'
    severity = streakHigh >= 5 || latest >= 9 ? 'crimson' : 'amber'
    label = `${streakHigh}-day elevated stress streak`
    narrative = `Stress has stayed at ${latest}/10 for ${streakHigh} days. Sustained elevation matters more than a single rough day.`
    nudge =
      'Name one concrete driver (bill, decision, conflict) — then take one 10-minute action on it.'
  } else if (spike) {
    trend = 'rising'
    reasonCode = 'spike'
    severity = latest >= 8 ? 'amber' : 'yellow'
    label = 'Sharp stress jump today'
    narrative = `Stress moved from ${previous}/10 to ${latest}/10 in one day. Spikes are information, not failure.`
    nudge =
      'Write one sentence on what changed. If a bill or decision is the spark, open that surface next.'
  } else if (slope >= 0.35 && latest >= 5) {
    trend = 'rising'
    reasonCode = 'slope_up'
    severity = latest >= 8 || slope >= 0.7 ? 'amber' : 'yellow'
    label = 'Stress is climbing'
    narrative = `Trend slope is +${slope.toFixed(2)} pts/day across ${values.length} check-ins (now ${latest}/10). Rising load often leads decisions.`
    nudge =
      'Protect the next decision: pause big commitments until the slope flattens for 3 days.'
  } else if (vol >= 2.2 && m >= 4) {
    trend = 'volatile'
    reasonCode = 'volatility'
    severity = 'yellow'
    label = 'Stress is swinging hard'
    narrative = `Volatility is ${vol.toFixed(1)} on a 1–10 scale — large day-to-day swings. Whiplash makes timing harder than a steady high.`
    nudge =
      'Pick a fixed check-in time and one weekly money ritual to damp the swing.'
  } else if (m >= 7) {
    trend = 'elevated'
    reasonCode = 'high_level'
    severity = 'amber'
    label = 'Elevated stress baseline'
    narrative = `Average stress is ${m.toFixed(1)}/10 over the last ${values.length} days. The floor is high even without a new spike.`
    nudge =
      'Lower the floor: one open loop (bill, path step, or conversation) closed today.'
  } else if (slope <= -0.35 && latest <= 6) {
    trend = 'falling'
    reasonCode = 'recovery'
    severity = 'emerald'
    label = 'Stress is easing'
    narrative = `Slope is ${slope.toFixed(2)} pts/day — load is coming down (now ${latest}/10). Protect the recovery; don’t re-load immediately.`
    nudge = 'Keep the habit that helped. Optional: log what reduced the pressure.'
    shouldSignal = latest <= 4 // celebrate only when clearly calmer
  } else if (streakCalm >= 3) {
    trend = 'steady'
    reasonCode = 'steady_ok'
    severity = 'emerald'
    label = 'Calm stretch'
    narrative = `${streakCalm} consecutive calm days (≤3/10). Steady is a readiness asset.`
    nudge = 'Stay the course — no heroic moves required.'
    shouldSignal = false
  } else {
    trend = 'steady'
    reasonCode = 'steady_ok'
    severity = 'cyan'
    label = 'Stress is holding steady'
    narrative = `Mean ${m.toFixed(1)}/10 · slope ${slope >= 0 ? '+' : ''}${slope.toFixed(2)} · latest ${latest}/10. No sharp pattern change.`
    nudge = 'Continue daily check-ins. Act only if slope turns up or level breaks 7.'
    shouldSignal = false
  }

  return {
    slope: Math.round(slope * 100) / 100,
    mean: Math.round(m * 10) / 10,
    volatility: Math.round(vol * 10) / 10,
    latest,
    previous,
    sampleSize: values.length,
    streakHigh,
    streakCalm,
    index,
    trend,
    reasonCode,
    label,
    narrative,
    nudge,
    severity,
    shouldSignal,
  }
}
