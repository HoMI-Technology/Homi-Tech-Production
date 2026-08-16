/**
 * Housing / readiness legal chrome — SSOT for product copy.
 * Educational posture only. Not a substitute for counsel review.
 */

export const HOUSING_READINESS_DISCLAIMER =
  "Educational readiness guidance only. HōMI is not a lender, broker, or credit " +
  "decisioning system. Nothing here is a commitment to lend, a pre-qualification, " +
  "a credit approval, or personalized financial, legal, tax, or investment advice. " +
  "Confirm all numbers with licensed professionals before you act.";

export const PATH_LEGAL_SHORT =
  "Not a commitment to lend. Not credit approval. Educational only — reassess before irreversible moves.";

export const PREFLIGHT_LEGAL_SHORT =
  "Protective check only. Not a loan decision or guarantee of affordability.";

export const SCENARIO_LEGAL_SHORT =
  "Illustrative five-year model. Not a forecast, appraisal, or lending offer.";

export const HOUSEHOLD_LEGAL_SHORT =
  "Joint readiness uses the weaker member's score and shared hard-stops. Not joint credit.";

export const CERTIFICATE_LEGAL =
  "This credential summarizes self-reported and product-computed readiness signals " +
  "at a point in time. It is not a credit report, appraisal, underwriting decision, " +
  "or commitment to lend. Partners may use it for education only.";

/**
 * Affirmative approval phrases product copy must avoid.
 * Note: "not a commitment to lend" is *required* legal chrome — only ban
 * positive approval claims, not the negation phrase.
 */
export const HOUSING_COPY_BANNED = [
  "you're approved",
  "you are approved",
  "pre-approved",
  "preapproved",
  "we will fund your",
  "loan is approved",
] as const;
