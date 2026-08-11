import type { AssessmentInputs } from "@/lib/scoring";
import type {
  DeadlineOriginChoice,
  DecisionType,
  ReferralSourceChoice,
} from "@/lib/assessment/types";
import type { ResponseValue } from "@/lib/questions/bank";

export interface ConflictResponses {
  referralSource: ReferralSourceChoice | null;
  deadlineOrigin: DeadlineOriginChoice | null;
}

export class UnmappedDecisionTypeError extends Error {
  readonly decisionType: string;

  constructor(decisionType: string) {
    super(`No input mapper registered for decision type: ${decisionType}`);
    this.name = "UnmappedDecisionTypeError";
    this.decisionType = decisionType;
  }
}

type VerticalMapper = (
  responses: Record<string, ResponseValue>,
  conflict: ConflictResponses,
) => AssessmentInputs;

function num(value: ResponseValue | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: ResponseValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function dtiBandToRatio(band: string): number {
  switch (band) {
    case "under_20":
      return 0.18;
    case "20_28":
      return 0.24;
    case "29_36":
      return 0.32;
    case "37_43":
      return 0.4;
    case "over_43":
      return 0.48;
    default:
      return 0.35;
  }
}

function downPaymentChoiceToPercent(choice: string): number {
  switch (choice) {
    case "20_plus":
      return 0.22;
    case "15_19":
      return 0.17;
    case "10_14":
      return 0.12;
    case "5_9":
      return 0.07;
    case "3_4":
      return 0.035;
    case "less_3":
      return 0.02;
    default:
      return 0.1;
  }
}

function emergencyChoiceToMonths(choice: string): number {
  switch (choice) {
    case "6_plus":
      return 8;
    case "4_5":
      return 4.5;
    case "2_3":
      return 2.5;
    case "1":
      return 1;
    case "none":
      return 0.25;
    default:
      return 2;
  }
}

function creditChoiceToScore(choice: string): number {
  switch (choice) {
    case "excellent":
      return 780;
    case "good":
      return 730;
    case "fair":
      return 670;
    case "poor":
      return 610;
    case "very_poor":
      return 550;
    default:
      return 650;
  }
}

function partnerChoiceToScale(choice: string): number | null {
  switch (choice) {
    case "fully_aligned":
      return 9;
    case "mostly_aligned":
      return 7;
    case "partially":
      return 4;
    case "not_aligned":
      return 2;
    case "solo":
      return null;
    default:
      return 5;
  }
}

function fomoChoiceToScale(choice: string): number {
  switch (choice) {
    case "genuine":
      return 2;
    case "mostly_genuine":
      return 3;
    case "mixed":
      return 5;
    case "mostly_fomo":
      return 8;
    case "fomo":
      return 10;
    default:
      return 5;
  }
}

function timelineChoiceToMonths(choice: string): number {
  switch (choice) {
    case "0_3":
      return 2;
    case "3_6":
      return 4;
    case "6_12":
      return 9;
    case "12_24":
      return 18;
    case "24_plus":
      return 30;
    default:
      return 9;
  }
}

function housingBudgetToRatio(choice: string): number | undefined {
  switch (choice) {
    case "under_25":
      return 0.24;
    case "25_28":
      return 0.265;
    case "29_33":
      return 0.31;
    case "34_40":
      return 0.37;
    case "over_40":
      return 0.42;
    default:
      return undefined;
  }
}

function sliderValue(value: ResponseValue | undefined, fallback = 5): number {
  const n = num(value);
  return n !== null ? n : fallback;
}

function estimateSavingsRate(totalSavings: number | null, monthlyIncome: number): number {
  if (!monthlyIncome || monthlyIncome <= 0) return 0.1;
  if (!totalSavings || totalSavings <= 0) return 0.05;
  // Rough heuristic: assume savings accumulated over ~24 months at current pace.
  const impliedMonthly = totalSavings / 24;
  return Math.min(0.4, Math.max(0.02, impliedMonthly / monthlyIncome));
}

function urgencyToDeadlineOrigin(urgency: number): DeadlineOriginChoice | undefined {
  if (urgency >= 8) return "external";
  if (urgency <= 3) return "none";
  return "mine";
}

/**
 * Home-buying vertical mapper. Behavior-identical to the pre-5.5 monolithic
 * `bankResponsesToInputs` — feeds the frozen AssessmentInputs shape.
 */
export function mapHomeBuyingResponses(
  responses: Record<string, ResponseValue>,
  conflict: ConflictResponses,
): AssessmentInputs {
  const income = num(responses.fin_income) ?? 0;
  const debt = num(responses.fin_debt_payments) ?? 0;

  let debtToIncomeRatio = income > 0 ? debt / income : 0;
  const dtiBand = str(responses.fin_dti_ratio);
  if (income <= 0 && dtiBand) {
    debtToIncomeRatio = dtiBandToRatio(dtiBand);
  }

  const downPaymentPercent = downPaymentChoiceToPercent(str(responses.fin_down_payment) ?? "");
  const emergencyFundMonths = emergencyChoiceToMonths(str(responses.fin_emergency_fund) ?? "");
  const creditScore = creditChoiceToScore(str(responses.fin_credit_score) ?? "");

  const confidenceLevel = sliderValue(responses.emo_confidence);
  const lifeStability = sliderValue(
    responses.emo_lifestyle_ready,
    sliderValue(responses.emo_clarity),
  );

  const partnerAlignment = partnerChoiceToScale(str(responses.emo_partner_alignment) ?? "solo");
  const fomoLevel = fomoChoiceToScale(str(responses.emo_fomo) ?? "mixed");

  const timeHorizonMonths = timelineChoiceToMonths(str(responses.tim_timeline) ?? "6_12");
  const savingsRate = estimateSavingsRate(num(responses.fin_savings_total), income);

  const twentyPercentGoal = 0.2;
  const downPaymentProgress = Math.min(1, downPaymentPercent / twentyPercentGoal);

  const housingBand = str(responses.fin_housing_budget);
  const monthlyHousingRatio = housingBand ? housingBudgetToRatio(housingBand) : undefined;

  const urgency = sliderValue(responses.tim_urgency, 5);
  const deadlineFromUrgency = urgencyToDeadlineOrigin(urgency);

  return {
    debtToIncomeRatio,
    downPaymentPercent,
    emergencyFundMonths,
    creditScore,
    lifeStability,
    confidenceLevel,
    partnerAlignment,
    fomoLevel,
    timeHorizonMonths,
    savingsRate,
    downPaymentProgress,
    monthlyHousingRatio,
    referralSource: conflict.referralSource ?? undefined,
    deadlineOrigin: conflict.deadlineOrigin ?? deadlineFromUrgency,
  };
}

/**
 * Per-vertical mapper registry (Plans.md 5.5). Only registered verticals can
 * produce AssessmentInputs — unmapped / inactive types hard-reject so they
 * never silently fall through to home or emit zeroed inputs.
 */
const MAPPERS: Partial<Record<DecisionType, VerticalMapper>> = {
  home_buying: mapHomeBuyingResponses,
  // car / career_change / education / starting_a_business: registered in 5.7+
};

/**
 * Maps canonical question-bank responses (+ optional conflict fields) into the
 * AssessmentInputs shape consumed by the frozen scoring engine, dispatched by
 * decision vertical.
 */
export function bankResponsesToInputs(
  responses: Record<string, ResponseValue>,
  conflict: ConflictResponses,
  decisionType: DecisionType,
): AssessmentInputs {
  const mapper = MAPPERS[decisionType];
  if (!mapper) {
    throw new UnmappedDecisionTypeError(decisionType);
  }
  return mapper(responses, conflict);
}
