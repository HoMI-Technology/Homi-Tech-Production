/**
 * Raw form state for the full assessment flow, before derivation into the
 * canonical AssessmentInputs consumed by computeScore(). Kept separate so
 * the UI can collect natural units ($ income, $ debt, choice bands) while
 * the engine only ever sees normalized ratios/numbers.
 */

export type EmergencyFundChoice = "lt1" | "1to3" | "3to6" | "6plus";
export type TimeHorizonChoice = "lt3" | "3to6" | "6to12" | "12plus";

/**
 * Decision-type foundation. Only "home_buying" is active today — the rest
 * are placeholders for future decision verticals. No branching logic exists
 * yet; this is purely a UI foundation and a value stored alongside the
 * assessment's decision_type column.
 */
export type DecisionType =
  | "home_buying"
  | "car"
  | "career_change"
  | "education"
  | "starting_a_business";

export const DECISION_TYPE_LABELS: Record<DecisionType, string> = {
  home_buying: "Buying a home",
  car: "Car",
  career_change: "Career change",
  education: "Education",
  starting_a_business: "Starting a business",
};

export const ACTIVE_DECISION_TYPES: DecisionType[] = ["home_buying"];

/** Who brought this decision to the user. Optional, skippable, never scored. */
export type ReferralSourceChoice = "me" | "family" | "agent" | "lender";
/** Whose deadline this is. Optional, skippable, never scored. */
export type DeadlineOriginChoice = "mine" | "external" | "none";

export const REFERRAL_SOURCE_LABELS: Record<ReferralSourceChoice, string> = {
  me: "Just me",
  family: "Family",
  agent: "A real estate agent",
  lender: "A lender",
};

export const DEADLINE_ORIGIN_LABELS: Record<DeadlineOriginChoice, string> = {
  mine: "Mine",
  external: "Someone else's",
  none: "No real deadline",
};

export const EMERGENCY_FUND_MONTHS: Record<EmergencyFundChoice, number> = {
  lt1: 0.5,
  "1to3": 2,
  "3to6": 4.5,
  "6plus": 8,
};

export const EMERGENCY_FUND_LABELS: Record<EmergencyFundChoice, string> = {
  lt1: "Less than 1 month",
  "1to3": "1–3 months",
  "3to6": "3–6 months",
  "6plus": "6+ months",
};

export const TIME_HORIZON_MONTHS: Record<TimeHorizonChoice, number> = {
  lt3: 2,
  "3to6": 4,
  "6to12": 9,
  "12plus": 18,
};

export const TIME_HORIZON_LABELS: Record<TimeHorizonChoice, string> = {
  lt3: "Less than 3 months",
  "3to6": "3–6 months",
  "6to12": "6–12 months",
  "12plus": "12+ months",
};

/** Raw, natural-unit form state collected by the full assessment flow. */
export interface FullAssessmentForm {
  // Decision-type foundation
  decisionType: DecisionType;

  // Financial Reality
  monthlyGrossIncome: number | null;
  monthlyDebtPayments: number | null;
  targetHomePrice: number | null;
  downPaymentSaved: number | null;
  emergencyFundChoice: EmergencyFundChoice | null;
  creditScore: number | null;
  expectedMonthlyHousingPayment: number | null; // optional, skippable

  // Emotional Truth
  lifeStability: number;
  confidenceLevel: number;
  partnered: "yes" | "no" | null;
  partnerAlignment: number;
  fomoLevel: number;

  // Perfect Timing
  timeHorizonChoice: TimeHorizonChoice | null;
  savingsRatePercent: number; // 0-40

  // Conflict / bias check (optional, skippable — never affects scoring)
  referralSource: ReferralSourceChoice | null;
  deadlineOrigin: DeadlineOriginChoice | null;
}

export const INITIAL_FULL_FORM: FullAssessmentForm = {
  decisionType: "home_buying",

  monthlyGrossIncome: null,
  monthlyDebtPayments: null,
  targetHomePrice: null,
  downPaymentSaved: null,
  emergencyFundChoice: null,
  creditScore: null,
  expectedMonthlyHousingPayment: null,

  lifeStability: 5,
  confidenceLevel: 5,
  partnered: null,
  partnerAlignment: 5,
  fomoLevel: 5,

  timeHorizonChoice: null,
  savingsRatePercent: 10,

  referralSource: null,
  deadlineOrigin: null,
};

function creditBand(score: number): string {
  if (score >= 740) return "Excellent";
  if (score >= 700) return "Good";
  if (score >= 660) return "Fair";
  if (score >= 620) return "Below average";
  return "Poor";
}

export function creditScoreBandHint(score: number | null): string {
  if (score === null || Number.isNaN(score)) return "";
  return creditBand(clampCredit(score));
}

function clampCredit(score: number): number {
  if (score < 300) return 300;
  if (score > 850) return 850;
  return score;
}
