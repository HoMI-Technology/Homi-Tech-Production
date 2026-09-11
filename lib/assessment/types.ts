/**
 * Assessment choice labels and client allowlists. Question banks map these
 * natural units into canonical AssessmentInputs for computeScore().
 */

export type EmergencyFundChoice = "lt1" | "1to3" | "3to6" | "6plus";
export type TimeHorizonChoice = "lt3" | "3to6" | "6to12" | "12plus";

/**
 * Decision-type foundation. Car vertical active. Home buying + car are
 * production-enabled; the remaining slugs are placeholders for future
 * verticals. Branching runs off this value through the question bank, the
 * mapper registry, and per-vertical copy. See Plans.md 5.9.
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

/**
 * CLIENT allowlist: what the picker offers. Phase 2 of the 5.9 ParallelChange —
 * SERVER_ACTIVE_DECISION_TYPES already accepts "car", so this cannot out-run
 * the server. Invariant asserted in __tests__/decision-type-canon.test.ts.
 */
export const ACTIVE_DECISION_TYPES: DecisionType[] = ["home_buying", "car"];

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
