/**
 * HōMI-Score engine — ported from production lib/scoring.
 * Pure, deterministic 0–100 score from Financial / Emotional / Timing pillars.
 * Assessment inputs are derived from live budget numbers + readiness profile.
 */

export type Verdict = "READY" | "ALMOST_THERE" | "BUILD_FIRST" | "NOT_YET";

export interface AssessmentInputs {
  debtToIncomeRatio: number;
  downPaymentPercent: number;
  emergencyFundMonths: number;
  creditScore: number;
  lifeStability: number;
  confidenceLevel: number;
  partnerAlignment: number | null;
  fomoLevel: number;
  timeHorizonMonths: number;
  savingsRate: number;
  downPaymentProgress: number;
  monthlyHousingRatio?: number;
}

export interface FinancialBreakdown {
  debtToIncome: number;
  downPayment: number;
  emergencyFund: number;
  creditHealth: number;
  total: number;
}

export interface EmotionalBreakdown {
  lifeStability: number;
  confidenceLevel: number;
  partnerAlignment: number;
  fomoCheck: number;
  total: number;
  singleRedistribution: boolean;
}

export interface TimingBreakdown {
  timeHorizon: number;
  savingsRate: number;
  downPaymentProgress: number;
  total: number;
}

export type HardStopCode =
  | "DTI_OVER_50"
  | "HOUSING_RATIO_OVER_45"
  | "RUNWAY_UNDER_1_MONTH"
  | "CREDIT_UNDER_620";

export interface HardStopReason {
  code: HardStopCode;
  message: string;
}

export interface ScoringWarning {
  code: string;
  message: string;
}

export interface AssessmentResult {
  score: number;
  verdict: Verdict;
  financial: FinancialBreakdown;
  emotional: EmotionalBreakdown;
  timing: TimingBreakdown;
  warnings: ScoringWarning[];
  hardStops: HardStopReason[];
}

export const PILLAR_MAX_POINTS = Object.freeze({
  financial: 35,
  emotional: 35,
  timing: 30,
});

const THRESHOLD_READY = 80;
const THRESHOLD_ALMOST = 65;
const THRESHOLD_BUILD = 50;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value <= min) return min;
  if (value >= max) return max;
  return value;
}

function scoreDTI(dti: number): number {
  const pct = clamp(dti, 0, 1) * 100;
  if (pct <= 28) return 10;
  if (pct <= 36) return 7;
  if (pct <= 43) return 4;
  return 0;
}

function scoreDownPayment(pct: number): number {
  const dp = clamp(pct, 0, 1) * 100;
  if (dp >= 20) return 10;
  if (dp >= 10) return 7;
  if (dp >= 5) return 4;
  return 0;
}

function scoreEmergencyFund(months: number): number {
  const m = clamp(months, 0, 120);
  if (m >= 6) return 8;
  if (m >= 3) return 5;
  if (m >= 1) return 2;
  return 0;
}

function scoreCreditHealth(score: number): number {
  const s = clamp(score, 300, 850);
  if (s >= 740) return 7;
  if (s >= 700) return 5;
  if (s >= 660) return 3;
  return 0;
}

function computeFinancial(inputs: AssessmentInputs): FinancialBreakdown {
  const debtToIncome = scoreDTI(inputs.debtToIncomeRatio);
  const downPayment = scoreDownPayment(inputs.downPaymentPercent);
  const emergencyFund = scoreEmergencyFund(inputs.emergencyFundMonths);
  const creditHealth = scoreCreditHealth(inputs.creditScore);
  return {
    debtToIncome,
    downPayment,
    emergencyFund,
    creditHealth,
    total: debtToIncome + downPayment + emergencyFund + creditHealth,
  };
}

function sliderToPoints(slider: number, maxPoints: number): number {
  const s = clamp(slider, 1, 10);
  if (s === 10) return maxPoints;
  return Math.floor(((s - 1) / 9) * maxPoints);
}

function fomoToPoints(slider: number, maxPoints: number): number {
  const s = clamp(slider, 1, 10);
  return sliderToPoints(11 - s, maxPoints);
}

function computeEmotional(inputs: AssessmentInputs): EmotionalBreakdown {
  const isSingle = inputs.partnerAlignment === null;
  const lifeStabilityRaw = sliderToPoints(inputs.lifeStability, 9);
  const confidenceRaw = sliderToPoints(inputs.confidenceLevel, 9);
  const fomoRaw = fomoToPoints(inputs.fomoLevel, 8);

  if (!isSingle) {
    const partnerRaw = sliderToPoints(inputs.partnerAlignment as number, 9);
    return {
      lifeStability: lifeStabilityRaw,
      confidenceLevel: confidenceRaw,
      partnerAlignment: partnerRaw,
      fomoCheck: fomoRaw,
      total: lifeStabilityRaw + confidenceRaw + partnerRaw + fomoRaw,
      singleRedistribution: false,
    };
  }

  const PARTNER_MAX = 9;
  const baseMax = { life: 9, confidence: 9, fomo: 8 };
  const baseEarned = {
    life: lifeStabilityRaw,
    confidence: confidenceRaw,
    fomo: fomoRaw,
  };
  const ratioLife = baseEarned.life / baseMax.life;
  const ratioConfidence = baseEarned.confidence / baseMax.confidence;
  const ratioFomo = baseEarned.fomo / baseMax.fomo;
  const ratioSum = ratioLife + ratioConfidence + ratioFomo;

  let bonusLife: number;
  let bonusConfidence: number;
  let bonusFomo: number;

  if (ratioSum === 0) {
    bonusLife = 3;
    bonusConfidence = 3;
    bonusFomo = 3;
  } else {
    const rawBonusLife = (ratioLife / ratioSum) * PARTNER_MAX;
    const rawBonusConfidence = (ratioConfidence / ratioSum) * PARTNER_MAX;
    const rawBonusFomo = (ratioFomo / ratioSum) * PARTNER_MAX;
    bonusLife = Math.floor(rawBonusLife);
    bonusConfidence = Math.floor(rawBonusConfidence);
    bonusFomo = Math.floor(rawBonusFomo);
    let remainder = PARTNER_MAX - (bonusLife + bonusConfidence + bonusFomo);
    const fractionals = [
      { key: "life" as const, frac: rawBonusLife - bonusLife },
      { key: "confidence" as const, frac: rawBonusConfidence - bonusConfidence },
      { key: "fomo" as const, frac: rawBonusFomo - bonusFomo },
    ].sort((a, b) => b.frac - a.frac);
    for (const item of fractionals) {
      if (remainder <= 0) break;
      if (item.key === "life") bonusLife++;
      else if (item.key === "confidence") bonusConfidence++;
      else bonusFomo++;
      remainder--;
    }
  }

  const finalLife = lifeStabilityRaw + bonusLife;
  const finalConfidence = confidenceRaw + bonusConfidence;
  const finalFomo = fomoRaw + bonusFomo;
  return {
    lifeStability: finalLife,
    confidenceLevel: finalConfidence,
    partnerAlignment: 0,
    fomoCheck: finalFomo,
    total: finalLife + finalConfidence + finalFomo,
    singleRedistribution: true,
  };
}

function scoreTimeHorizon(months: number): number {
  const m = clamp(months, 0, 600);
  if (m > 12) return 10;
  if (m >= 6) return 7;
  if (m >= 3) return 4;
  return 2;
}

function scoreSavingsRate(rate: number): number {
  const pct = clamp(rate, 0, 1) * 100;
  if (pct >= 20) return 10;
  if (pct >= 10) return 7;
  if (pct >= 5) return 4;
  return 1;
}

function scoreDownPaymentProgress(progress: number): number {
  const pct = clamp(progress, 0, 1) * 100;
  if (pct >= 80) return 10;
  if (pct >= 50) return 7;
  if (pct >= 25) return 4;
  return 1;
}

function computeTiming(inputs: AssessmentInputs): TimingBreakdown {
  const timeHorizon = scoreTimeHorizon(inputs.timeHorizonMonths);
  const savingsRate = scoreSavingsRate(inputs.savingsRate);
  const downPaymentProgress = scoreDownPaymentProgress(inputs.downPaymentProgress);
  return {
    timeHorizon,
    savingsRate,
    downPaymentProgress,
    total: timeHorizon + savingsRate + downPaymentProgress,
  };
}

function deriveVerdict(score: number): Verdict {
  if (score >= THRESHOLD_READY) return "READY";
  if (score >= THRESHOLD_ALMOST) return "ALMOST_THERE";
  if (score >= THRESHOLD_BUILD) return "BUILD_FIRST";
  return "NOT_YET";
}

export function scoreToVerdict(score: number): Verdict {
  return deriveVerdict(score);
}

function detectHardStops(inputs: AssessmentInputs): HardStopReason[] {
  const reasons: HardStopReason[] = [];
  if (inputs.debtToIncomeRatio > 0.5) {
    reasons.push({
      code: "DTI_OVER_50",
      message:
        "Your debt-to-income ratio is above 50%. Buying right now would leave almost no margin for surprises.",
    });
  }
  if (
    typeof inputs.monthlyHousingRatio === "number" &&
    inputs.monthlyHousingRatio > 0.45
  ) {
    reasons.push({
      code: "HOUSING_RATIO_OVER_45",
      message:
        "The home you are considering would consume more than 45% of your monthly income. That is the line where one bad month becomes a crisis.",
    });
  }
  if (inputs.emergencyFundMonths < 1) {
    reasons.push({
      code: "RUNWAY_UNDER_1_MONTH",
      message:
        "You have less than one month of expenses set aside. Owning a home means owning the surprises that come with it — you need runway first.",
    });
  }
  if (inputs.creditScore < 620) {
    reasons.push({
      code: "CREDIT_UNDER_620",
      message:
        "Your credit score is below 620. Lenders will price this as high-risk. Build credit first; you protect yourself by waiting.",
    });
  }
  return reasons;
}

function detectWarnings(inputs: AssessmentInputs): ScoringWarning[] {
  const warnings: ScoringWarning[] = [];
  const allMaxed =
    inputs.lifeStability === 10 &&
    inputs.confidenceLevel === 10 &&
    (inputs.partnerAlignment === null || inputs.partnerAlignment === 10) &&
    inputs.fomoLevel === 1;
  if (allMaxed) {
    warnings.push({
      code: "FOMO_WARNING",
      message:
        "All emotional indicators are at their optimal values. Take a moment to honestly reassess.",
    });
  }
  if (inputs.fomoLevel >= 8 && inputs.timeHorizonMonths < 3) {
    warnings.push({
      code: "PRESSURE_RUSH",
      message:
        "High external pressure combined with a very short timeline. Consider whether you are being rushed.",
    });
  }
  return warnings;
}

export function computeScore(inputs: AssessmentInputs): AssessmentResult {
  const financial = computeFinancial(inputs);
  const emotional = computeEmotional(inputs);
  const timing = computeTiming(inputs);
  const rawScore = financial.total + emotional.total + timing.total;
  const score = Math.round(clamp(rawScore, 0, 100) * 10) / 10;
  const hardStops = detectHardStops(inputs);
  const baseVerdict = deriveVerdict(score);
  const verdict: Verdict = hardStops.length > 0 ? "NOT_YET" : baseVerdict;
  return {
    score,
    verdict,
    financial,
    emotional,
    timing,
    warnings: detectWarnings(inputs),
    hardStops,
  };
}

export function generateKeyInsight(result: AssessmentResult): string {
  const pillars = [
    {
      name: "Financial Reality",
      pct: Math.round((result.financial.total / PILLAR_MAX_POINTS.financial) * 100),
    },
    {
      name: "Emotional Truth",
      pct: Math.round((result.emotional.total / PILLAR_MAX_POINTS.emotional) * 100),
    },
    {
      name: "Perfect Timing",
      pct: Math.round((result.timing.total / PILLAR_MAX_POINTS.timing) * 100),
    },
  ].sort((a, b) => b.pct - a.pct);
  const strongest = pillars[0];
  const weakest = pillars[2];

  if (result.hardStops.length > 0) {
    return `Your strongest signal is ${strongest.name} (${strongest.pct}/100), but a red-line condition is active. This is a protection signal — not a judgment. Clear it first.`;
  }
  if (pillars.every((p) => p.pct >= 80)) {
    return `Your strongest signal is ${strongest.name} (${strongest.pct}/100). All three pillars show favorable readiness.`;
  }
  if (strongest.pct - weakest.pct >= 15) {
    return `Your strongest signal is ${strongest.name} (${strongest.pct}/100). The gap is ${weakest.name} (${weakest.pct}/100) — and that gap is the map.`;
  }
  return `Your readiness is balanced: ${strongest.name} at ${strongest.pct}/100 and ${weakest.name} at ${weakest.pct}/100 are moving together.`;
}

export function generateNextSteps(result: AssessmentResult): string[] {
  const steps: string[] = [];
  const f = result.financial;
  const e = result.emotional;
  const t = result.timing;
  const fPct = (f.total / PILLAR_MAX_POINTS.financial) * 100;
  const ePct = (e.total / PILLAR_MAX_POINTS.emotional) * 100;
  const tPct = (t.total / PILLAR_MAX_POINTS.timing) * 100;

  for (const stop of result.hardStops) {
    switch (stop.code) {
      case "DTI_OVER_50":
        steps.push("Bring debt-to-income below 43% — pay the highest-rate balance first.");
        break;
      case "HOUSING_RATIO_OVER_45":
        steps.push("Re-scope the target so housing stays under 36% of gross income.");
        break;
      case "RUNWAY_UNDER_1_MONTH":
        steps.push("Build at least one month of expenses in cash before any other move.");
        break;
      case "CREDIT_UNDER_620":
        steps.push("Rebuild credit above 660 with on-time payments and lower utilization.");
        break;
    }
  }

  if (fPct < 60) {
    if (f.emergencyFund < 5) steps.push("Build the emergency fund to 3–6 months of expenses.");
    if (f.debtToIncome < 7) steps.push("Reduce monthly debt until DTI sits at or below 36%.");
    if (f.downPayment < 7) steps.push("Grow the down payment toward 10–20%.");
    if (f.creditHealth < 5) steps.push("Push credit above 700 for better pricing.");
  } else if (fPct < 80) {
    if (f.emergencyFund < 8) steps.push("Top the emergency fund to a full 6 months.");
    if (f.creditHealth < 7) steps.push("A score above 740 earns the best tier. You're close.");
  }

  if (ePct < 60) {
    steps.push("Sit with the emotional side: write down why now, and who is applying pressure.");
    if (e.fomoCheck < 4)
      steps.push("The urgency you feel is external. Give the decision 30 quiet days.");
  }

  if (tPct < 60) {
    if (t.savingsRate < 7) steps.push("Raise savings rate toward 20% of income.");
    if (t.downPaymentProgress < 7)
      steps.push("Set a monthly auto-transfer toward the down-payment goal.");
    if (t.timeHorizon < 7) steps.push("Extend the timeline past 6 months.");
  }

  if (steps.length === 0) {
    steps.push("Re-check readiness in 30 days to confirm it holds steady.");
    steps.push("Lock rate research now so you can move deliberately.");
  }
  return steps.slice(0, 5);
}

export const VERDICT_META: Record<
  Verdict,
  { label: string; short: string; color: string; glow: string }
> = {
  READY: {
    label: "Ready",
    short: "READY",
    color: "text-emerald",
    glow: "rgba(52,211,153,0.45)",
  },
  ALMOST_THERE: {
    label: "Almost there",
    short: "ALMOST",
    color: "text-cyan",
    glow: "rgba(34,211,238,0.4)",
  },
  BUILD_FIRST: {
    label: "Build first",
    short: "BUILD",
    color: "text-yellow",
    glow: "rgba(250,204,21,0.35)",
  },
  NOT_YET: {
    label: "Not yet",
    short: "NOT YET",
    color: "text-crimson",
    glow: "rgba(242,72,34,0.4)",
  },
};
