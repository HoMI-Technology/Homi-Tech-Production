import { z } from "zod";
import { ACTIVE_DECISION_TYPES, type DecisionType } from "@/lib/assessment/types";

/**
 * Shared assessment-inputs schema (T1.8b).
 *
 * Previously app/api/scoring/route.ts and app/api/assessments/route.ts each
 * defined their own zod schema for the same payload, and the bounds had
 * drifted apart. This is the single source of truth for both routes.
 *
 * Bounds are the intersection (i.e. the stricter bound wherever the two
 * prior schemas disagreed) of the two, which also matches the canonical
 * field semantics documented on `AssessmentInputs` in lib/scoring/engine.ts
 * (0-1 ratios, 300-850 FICO range, 1-10 sliders).
 *
 * Field-by-field bound tightened relative to the looser prior copy:
 * debtToIncomeRatio, downPaymentPercent, emergencyFundMonths, creditScore,
 * timeHorizonMonths, savingsRate, downPaymentProgress, monthlyHousingRatio.
 */
export const assessmentInputsSchema = z.object({
  debtToIncomeRatio: z.number().min(0).max(1),
  downPaymentPercent: z.number().min(0).max(1),
  emergencyFundMonths: z.number().min(0).max(120),
  creditScore: z.number().min(300).max(850),

  lifeStability: z.number().min(1).max(10),
  confidenceLevel: z.number().min(1).max(10),
  partnerAlignment: z.number().min(1).max(10).nullable(),
  fomoLevel: z.number().min(1).max(10),

  timeHorizonMonths: z.number().min(0).max(600),
  savingsRate: z.number().min(0).max(1),
  downPaymentProgress: z.number().min(0).max(1),

  monthlyHousingRatio: z.number().min(0).max(2).optional(),
});

export type AssessmentInputsPayload = z.infer<typeof assessmentInputsSchema>;

/**
 * Server-side allowlist for assessments.decision_type. Built from
 * ACTIVE_DECISION_TYPES — canon-but-inactive verticals ("Coming soon" in the
 * picker) are rejected here too, so activation is a single-array change in
 * lib/assessment/types.ts and never a client claim.
 */
export const activeDecisionTypeSchema = z.enum(
  ACTIVE_DECISION_TYPES as [DecisionType, ...DecisionType[]],
);
