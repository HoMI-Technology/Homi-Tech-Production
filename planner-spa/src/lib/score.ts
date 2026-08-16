/* ------------------------------------------------------------------ */
/* Canonical HōMI scoring engine — VERBATIM port of                    */
/* lib/scoring/engine.ts + lib/scoring/weights.ts + lib/brand          */
/* (GitHub HoMI-Technology/Homi-Tech-Production = source of truth).    */
/* Pure module, no side effects. Pillar maxes 35/35/30 are frozen.     */
/* ------------------------------------------------------------------ */

/* -------- weights (lib/scoring/weights.ts — C2 restricted boundary) -------- */

export const WEIGHTS = Object.freeze({ financial: 0.35, emotional: 0.35, timing: 0.3 })

export const PILLAR_MAX_POINTS = Object.freeze({ financial: 35, emotional: 35, timing: 30 })

/* -------- types -------- */

export type PillarKey = 'financial' | 'emotional' | 'timing'

export type VerdictKey = 'READY' | 'ALMOST_THERE' | 'BUILD_FIRST' | 'NOT_YET'

export type HardStopKey =
  | 'DTI_OVER_50'
  | 'HOUSING_RATIO_OVER_45'
  | 'RUNWAY_UNDER_1_MONTH'
  | 'CREDIT_UNDER_620'

export type WarningKey = 'FOMO_WARNING' | 'PRESSURE_RUSH'

/** The 13-field assessment contract consumed by computeScore. */
export interface AssessmentInputs {
  debtToIncomeRatio: number
  downPaymentPercent: number
  emergencyFundMonths: number
  creditScore: number
  lifeStability: number // slider 1–10
  confidenceLevel: number // slider 1–10
  partnerAlignment: number | null // slider 1–10, null = single buyer (redistribution)
  fomoLevel: number // slider 1–10, INVERTED (high pressure = fewer points)
  timeHorizonMonths: number
  savingsRate: number
  downPaymentProgress: number
  monthlyHousingRatio?: number
  /** informational only — never scored (consumed by lib/conflict/engine.ts) */
  referralSource?: string
  deadlineOrigin?: string
}

export type SubFactor = { key: string; label: string; pts: number; max: number }

export type PillarScore = { key: PillarKey; total: number; max: number; factors: SubFactor[] }

export type ScoreResult = {
  /** 0–100, rounded to 1 decimal. Preserved honestly even when hard-stops fire. */
  score: number
  verdict: VerdictKey
  pillars: Record<PillarKey, PillarScore>
  hardStops: HardStopKey[]
  warnings: WarningKey[]
}

/* -------- brand meta (lib/brand/index.ts — canon copy, verbatim) -------- */

export const PILLARS: Record<PillarKey, { label: string; question: string; max: number }> = {
  financial: { label: 'Financial Reality', question: 'Can you afford it?', max: 35 },
  emotional: { label: 'Emotional Truth', question: 'Do you really want it?', max: 35 },
  timing: { label: 'Perfect Timing', question: 'Is now the right moment?', max: 30 },
}

export const VERDICT_META: Record<VerdictKey, { label: string; line: string }> = {
  READY: { label: 'READY', line: 'All three rings align. Your compass becomes a key.' },
  ALMOST_THERE: { label: 'ALMOST THERE', line: "You've nearly cooled down. One or two things first." },
  BUILD_FIRST: { label: 'BUILD FIRST', line: 'Build First is not failure. It is the map.' },
  NOT_YET: { label: 'DO NOT PROCEED', line: 'Not yet is not no. It is clarity. It is protection.' },
}

/** Hard-stop protective copy (verbatim, engine.ts). Never shaming. */
export const HARD_STOP_MESSAGES: Record<HardStopKey, string> = {
  DTI_OVER_50:
    'Your debt-to-income ratio is above 50%. Buying right now would leave almost no margin for surprises.',
  HOUSING_RATIO_OVER_45:
    'The home you are considering would consume more than 45% of your monthly income. That is the line where one bad month becomes a crisis.',
  RUNWAY_UNDER_1_MONTH:
    'You have less than one month of expenses set aside. Owning a home means owning the surprises that come with it — you need runway first.',
  CREDIT_UNDER_620:
    'Your credit score is below 620. Lenders will price this as high-risk, and the interest cost alone could undo the purchase. Build credit first; you protect yourself by waiting.',
}

/** Non-scoring warnings, same protective register as the hard-stops. */
export const WARNING_MESSAGES: Record<WarningKey, string> = {
  // Verbatim from GitHub canon lib/scoring/engine.ts — do not reword.
  FOMO_WARNING:
    'All emotional indicators are at their optimal values. Take a moment to honestly reassess — buying a home is one of the biggest decisions you will make, and honesty here protects you.',
  PRESSURE_RUSH:
    'High external pressure combined with a very short timeline. Consider whether you are being rushed into a decision.',
}

/* -------- primitives -------- */

/** clamp(v, min, max): NaN / non-finite → min */
export function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

/* -------- financial reality (max 35) -------- */

/** DTI: ≤28%→10 · ≤36%→7 · ≤43%→4 · else 0 (max 10) */
export function scoreDTI(ratio: number): number {
  const r = clamp(ratio, 0, Number.POSITIVE_INFINITY)
  if (r <= 0.28) return 10
  if (r <= 0.36) return 7
  if (r <= 0.43) return 4
  return 0
}

/** Down payment: ≥20%→10 · ≥10%→7 · ≥5%→4 · else 0 (max 10) */
export function scoreDownPayment(ratio: number): number {
  const r = clamp(ratio, 0, Number.POSITIVE_INFINITY)
  if (r >= 0.2) return 10
  if (r >= 0.1) return 7
  if (r >= 0.05) return 4
  return 0
}

/** Emergency fund: ≥6mo→8 · ≥3→5 · ≥1→2 · else 0 (max 8) */
export function scoreEmergencyFund(months: number): number {
  const m = clamp(months, 0, Number.POSITIVE_INFINITY)
  if (m >= 6) return 8
  if (m >= 3) return 5
  if (m >= 1) return 2
  return 0
}

/** Credit health: ≥740→7 · ≥700→5 · ≥660→3 · else 0 (max 7) */
export function scoreCreditHealth(fico: number): number {
  const s = clamp(fico, 0, Number.POSITIVE_INFINITY)
  if (s >= 740) return 7
  if (s >= 700) return 5
  if (s >= 660) return 3
  return 0
}

/* -------- emotional truth (max 35) -------- */

/** slider 1–10 → points: floor((s−1)/9 × max); s=10 → max exactly */
export function sliderToPoints(slider: number, max: number): number {
  const s = clamp(slider, 1, 10)
  if (s === 10) return max
  return Math.floor(((s - 1) / 9) * max)
}

/** FOMO is inverted: high external pressure earns fewer points (max 8) */
export function fomoToPoints(slider: number): number {
  return sliderToPoints(11 - clamp(slider, 1, 10), 8)
}

type EmotionalFactors = { life: number; confidence: number; partner: number; fomo: number }

/**
 * Single-buyer redistribution: when partnerAlignment is null, the partner
 * pillar's 9 points are redistributed across life / confidence / fomo
 * proportionally to each factor's earned/max ratio. All-zero → even 3/3/3;
 * remainder points go to the largest fractional shares.
 *
 * CANON SYNC (verified vs GitHub engine.ts, differential-tested 1000 inputs):
 * bonuses are NOT capped per factor — the full 9-point pool is always
 * distributed, so solo emotional total = rawSum + 9 (max 26 + 9 = 35), which
 * keeps the pillar ceiling naturally. A factor's pts may exceed its nominal
 * max (e.g. life 12/9) — honest, intentional, UI clamps bar fill only.
 */
function scoreEmotional(inputs: AssessmentInputs): EmotionalFactors {
  const life = sliderToPoints(inputs.lifeStability, 9)
  const confidence = sliderToPoints(inputs.confidenceLevel, 9)
  const fomo = fomoToPoints(inputs.fomoLevel)

  if (inputs.partnerAlignment !== null) {
    return { life, confidence, partner: sliderToPoints(inputs.partnerAlignment, 9), fomo }
  }

  const base = [
    { pts: life, max: 9 },
    { pts: confidence, max: 9 },
    { pts: fomo, max: 8 },
  ]
  const ratios = base.map((b) => b.pts / b.max)
  const ratioSum = ratios.reduce((s, r) => s + r, 0)

  let shares: number[]
  if (ratioSum <= 0) {
    shares = [3, 3, 3]
  } else {
    const raw = ratios.map((r) => (r / ratioSum) * 9)
    shares = raw.map((r) => Math.floor(r))
    let remainder = 9 - shares.reduce((s, v) => s + v, 0)
    const byFraction = raw
      .map((r, i) => ({ i, frac: r - Math.floor(r) }))
      .sort((a, b) => b.frac - a.frac)
    for (const { i } of byFraction) {
      if (remainder <= 0) break
      shares[i] += 1
      remainder -= 1
    }
  }

  return {
    life: life + shares[0],
    confidence: confidence + shares[1],
    partner: 0,
    fomo: fomo + shares[2],
  }
}

/* -------- perfect timing (max 30) -------- */

/** Time horizon: >12mo→10 · ≥6→7 · ≥3→4 · else 2 (max 10) */
export function scoreTimeHorizon(months: number): number {
  const m = clamp(months, 0, Number.POSITIVE_INFINITY)
  if (m > 12) return 10
  if (m >= 6) return 7
  if (m >= 3) return 4
  return 2
}

/** Savings rate: ≥20%→10 · ≥10%→7 · ≥5%→4 · else 1 (max 10) */
export function scoreSavingsRate(ratio: number): number {
  const r = clamp(ratio, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)
  if (r >= 0.2) return 10
  if (r >= 0.1) return 7
  if (r >= 0.05) return 4
  return 1
}

/** Down-payment progress: ≥80%→10 · ≥50%→7 · ≥25%→4 · else 1 (max 10) */
export function scoreDownPaymentProgress(ratio: number): number {
  const r = clamp(ratio, 0, Number.POSITIVE_INFINITY)
  if (r >= 0.8) return 10
  if (r >= 0.5) return 7
  if (r >= 0.25) return 4
  return 1
}

/* -------- verdicts, hard-stops, warnings -------- */

/** scoreToVerdict — the single source of truth. Upper boundary inclusive. */
export function deriveVerdict(score: number): VerdictKey {
  if (score >= 80) return 'READY'
  if (score >= 65) return 'ALMOST_THERE'
  if (score >= 50) return 'BUILD_FIRST'
  return 'NOT_YET'
}

/** Hard-stops force NOT_YET regardless of score (score is still shown honestly). */
export function detectHardStops(inputs: AssessmentInputs): HardStopKey[] {
  const stops: HardStopKey[] = []
  if (inputs.debtToIncomeRatio > 0.5) stops.push('DTI_OVER_50')
  if (inputs.monthlyHousingRatio !== undefined && inputs.monthlyHousingRatio > 0.45)
    stops.push('HOUSING_RATIO_OVER_45')
  if (inputs.emergencyFundMonths < 1) stops.push('RUNWAY_UNDER_1_MONTH')
  if (inputs.creditScore < 620) stops.push('CREDIT_UNDER_620')
  return stops
}

/** Non-scoring honesty checks. */
export function detectWarnings(inputs: AssessmentInputs): WarningKey[] {
  const warnings: WarningKey[] = []
  const allSlidersOptimal =
    inputs.lifeStability >= 10 &&
    inputs.confidenceLevel >= 10 &&
    inputs.fomoLevel <= 1 &&
    (inputs.partnerAlignment === null || inputs.partnerAlignment >= 10)
  if (allSlidersOptimal) warnings.push('FOMO_WARNING')
  if (inputs.fomoLevel >= 8 && inputs.timeHorizonMonths < 3) warnings.push('PRESSURE_RUSH')
  return warnings
}

/* -------- the engine -------- */

/**
 * computeScore — pure, deterministic, 0–100.
 * Score = Financial (max 35) + Emotional (max 35) + Timing (max 30),
 * clamped [0,100], rounded to 1dp. Hard-stops force verdict NOT_YET
 * while the score itself is preserved honestly.
 *
 * Canon example (engine.ts docstring):
 *   { dti 0.25, dp 20%, ef 6mo, credit 750, sliders 8/7/9/3,
 *     horizon 18mo, savings 22%, progress 85% } → 92.0 READY
 */
export function computeScore(inputs: AssessmentInputs): ScoreResult {
  const emotional = scoreEmotional(inputs)

  const pillars: Record<PillarKey, PillarScore> = {
    financial: {
      key: 'financial',
      max: PILLAR_MAX_POINTS.financial,
      factors: [
        { key: 'dti', label: 'Debt-to-income', pts: scoreDTI(inputs.debtToIncomeRatio), max: 10 },
        { key: 'downPayment', label: 'Down payment', pts: scoreDownPayment(inputs.downPaymentPercent), max: 10 },
        { key: 'emergencyFund', label: 'Emergency fund', pts: scoreEmergencyFund(inputs.emergencyFundMonths), max: 8 },
        { key: 'credit', label: 'Credit health', pts: scoreCreditHealth(inputs.creditScore), max: 7 },
      ],
      total: 0,
    },
    emotional: {
      key: 'emotional',
      max: PILLAR_MAX_POINTS.emotional,
      factors: [
        { key: 'lifeStability', label: 'Life stability', pts: emotional.life, max: 9 },
        { key: 'confidence', label: 'Confidence', pts: emotional.confidence, max: 9 },
        { key: 'partnerAlignment', label: 'Partner alignment', pts: emotional.partner, max: 9 },
        { key: 'fomo', label: 'FOMO (inverted)', pts: emotional.fomo, max: 8 },
      ],
      total: 0,
    },
    timing: {
      key: 'timing',
      max: PILLAR_MAX_POINTS.timing,
      factors: [
        { key: 'timeHorizon', label: 'Time horizon', pts: scoreTimeHorizon(inputs.timeHorizonMonths), max: 10 },
        { key: 'savingsRate', label: 'Savings rate', pts: scoreSavingsRate(inputs.savingsRate), max: 10 },
        { key: 'downPaymentProgress', label: 'Down-payment progress', pts: scoreDownPaymentProgress(inputs.downPaymentProgress), max: 10 },
      ],
      total: 0,
    },
  }

  for (const pillar of Object.values(pillars)) {
    pillar.total = pillar.factors.reduce((s, f) => s + f.pts, 0)
  }

  const raw = pillars.financial.total + pillars.emotional.total + pillars.timing.total
  const score = Math.round(clamp(raw, 0, 100) * 10) / 10

  const hardStops = detectHardStops(inputs)
  const warnings = detectWarnings(inputs)
  const verdict: VerdictKey = hardStops.length > 0 ? 'NOT_YET' : deriveVerdict(score)

  return { score, verdict, pillars, hardStops, warnings }
}
