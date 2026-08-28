import { scoreToVerdict } from "@/lib/scoring/public";

/** Single SSOT for /developers EXAMPLE theater. Not engine output. */
export const EXAMPLE_SCORE = 61;
export const EXAMPLE_VERDICT = scoreToVerdict(EXAMPLE_SCORE);

export const EXAMPLE_COMPUTE_RESPONSE = {
  example: true,
  scoreName: "Decision Readiness",
  score: EXAMPLE_SCORE,
  verdict: EXAMPLE_VERDICT,
  dimensions: {
    financial_reality: 72,
    emotional_truth: 58,
    perfect_timing: 54,
  },
  insight: "Savings rate is strong. Emotional readiness still needs time.",
  notFor: ["credit", "employment", "housing", "insurance"] as const,
  disclaimer: "Educational guidance only. Not a consumer report.",
} as const;

export const EXAMPLE_COMPUTE_REQUEST_LEGACY = {
  example: true,
  note: "This object is rejected by POST /api/scoring. See AssessmentInputs.",
  user_context: {
    income: 95000,
    savings: 42000,
    debt: 12400,
    goal: "buy_home",
    timeline: "6_months",
    stress_level: "moderate",
  },
} as const;

export const EXAMPLE_RECEIPT_RESPONSE = {
  valid: true,
  status: "valid",
  receipt: {
    verdict: "BUILD_FIRST",
    scoreBand: "emerging",
    pillars: {
      financial: "developing",
      emotional: "developing",
      timing: "developing",
    },
    purpose: "educational_guidance",
    scoreName: "Decision Readiness",
    notFor: ["credit", "employment", "housing", "insurance"],
  },
} as const;

export const EXAMPLE_SESSION_RESPONSE = {
  id: "sess_example",
  url: "https://homitechnology.com/assessment?session=sess_example",
  expires_at: "2099-01-01T00:00:00.000Z",
} as const;

export const AGENT_INSTRUCTION = {
  before: "a high-stakes action that would commit the person",
  do: "POST /api/v1/share-sessions, then GET /api/v1/receipts/:token with Homi-Purpose educational_guidance",
  if_not_ready: "send the person to their Path to Ready — do not execute the commitment",
  never:
    "POST another person's finances to /api/scoring and treat it as their HōMI result; never use the output for lending, employment, or housing eligibility",
} as const;

export const ASSESSMENT_INPUT_FIELDS = [
  "debtToIncomeRatio",
  "downPaymentPercent",
  "emergencyFundMonths",
  "creditScore",
  "lifeStability",
  "confidenceLevel",
  "partnerAlignment",
  "fomoLevel",
  "timeHorizonMonths",
  "savingsRate",
  "downPaymentProgress",
  "monthlyHousingRatio",
] as const;
