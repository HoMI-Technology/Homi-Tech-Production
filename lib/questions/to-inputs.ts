import type { AssessmentInputs, SelfReportedCreditBand } from "@/lib/scoring/public";
import { EMERGENCY_FUND_MONTHS } from "@/lib/assessment/types";
import type {
  DeadlineOriginChoice,
  DecisionType,
  EmergencyFundChoice,
  ReferralSourceChoice,
} from "@/lib/assessment/types";
import type { ResponseValue } from "@/lib/questions/bank";

/**
 * Schema still requires a 300–850 number. This sentinel is never read for
 * creditHealth points or CREDIT_UNDER_620 when creditScoreProvenance is
 * band_ignored. Do not map excellent→780.
 */
export const BAND_IGNORED_CREDIT_SENTINEL = 650;

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

/**
 * Home 45-q credit band only. Never invent a FICO.
 * `unknown` / missing is today's 650 path: 0 credit points, no hard-stop.
 * There is no skip option in the bank — do not add one.
 */
export function normalizeSelfReportedCreditBand(choice: string): SelfReportedCreditBand {
  switch (choice) {
    case "excellent":
    case "good":
    case "fair":
    case "poor":
    case "very_poor":
      return choice;
    case "unknown":
    case "skipped":
      return "skipped";
    default:
      return "skipped";
  }
}

function creditBandInputs(choice: string): Pick<
  AssessmentInputs,
  "creditScore" | "creditScoreProvenance" | "selfReportedCreditBand"
> {
  return {
    creditScore: BAND_IGNORED_CREDIT_SENTINEL,
    creditScoreProvenance: "band_ignored",
    selfReportedCreditBand: normalizeSelfReportedCreditBand(choice),
  };
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
  const credit = creditBandInputs(str(responses.fin_credit_score) ?? "");

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
    ...credit,
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
    dtiProvenance: "self_report",
    downPaymentProvenance: "self_report",
    runwayProvenance: "self_report",
  };
}

// ---------------------------------------------------------------------------
// Car vertical (Plans.md 5.7)
// ---------------------------------------------------------------------------

function carDownPaymentChoiceToPercent(choice: string): number {
  switch (choice) {
    case "20_plus":
      return 0.22;
    case "10_19":
      return 0.15;
    case "5_9":
      return 0.07;
    case "under_5":
      return 0.03;
    default:
      return 0.1;
  }
}

/**
 * Car monthly-cost band → estimated payment as a fraction of GROSS income.
 * The question asks the band as a share of take-home; take-home is ~0.75 of
 * gross, so each band's midpoint is converted down (e.g. 20% take-home ≈ 15%
 * gross). Used only to estimate the new payment inside the DTI numerator.
 */
function carPaymentBandToRatio(band: string): number {
  switch (band) {
    case "under_10pct":
      return 0.07;
    case "10_15pct":
      return 0.11;
    case "15_20pct":
      return 0.14;
    case "over_20pct":
      return 0.18;
    default:
      return 0.12;
  }
}

/**
 * Car monthly-payment band → the engine's `monthlyHousingRatio` slot,
 * deliberately repurposed as the car-payment hard-stop.
 *
 * The engine is frozen: its only payment-burden guard is
 * `monthlyHousingRatio > 0.45`. The car payment red line (ADR-002) is a
 * different number — monthly cost above 20% of take-home. Rather than change
 * the engine, the mapper reports 0.46 (just past the fixed threshold) when and
 * only when the user selects `over_20pct`, so the guard fires exactly on the
 * car rule. Every other band omits the ratio and skips the guard entirely.
 * D10 (ADR-004) is free-tier quota, not this threshold.
 *
 * Consequence: the hard-stop surfaces as HOUSING_RATIO_OVER_45 with home-buying
 * copy. Task 5.8 must parameterize that message per vertical.
 */
function carPaymentBandToHousingRatio(band: string): number | undefined {
  if (band === "over_20pct") return 0.46;
  return undefined;
}

/**
 * Car emergency-fund choice → months of runway.
 *
 * The car bank (5.6) reuses the canonical EmergencyFundChoice values
 * (`lt1` / `1to3` / `3to6` / `6plus`), which do NOT match the home question's
 * option values (`6_plus` / `4_5` / `2_3` / `1` / `none`). Routing car answers
 * through the home mapper would drop every one of them onto the default and
 * silently disarm the runway hard-stop, so car reads the shared
 * EMERGENCY_FUND_MONTHS table instead.
 */
function carEmergencyChoiceToMonths(choice: string): number {
  return choice in EMERGENCY_FUND_MONTHS
    ? EMERGENCY_FUND_MONTHS[choice as EmergencyFundChoice]
    : 2;
}

/** Car credit question uses a simplified 4-band choice (home uses 6). */
function carCreditChoiceToScore(choice: string): number {
  switch (choice) {
    case "excellent":
      return 775;
    case "good":
      return 725;
    case "fair":
      return 675;
    case "low":
      return 600;
    default:
      return 650;
  }
}

/**
 * Car vertical mapper. Feeds the same frozen AssessmentInputs shape as home
 * buying, with car-specific derivations:
 *   - downPaymentPercent   → car down payment as % of vehicle price
 *   - debtToIncomeRatio    → (existing debt + estimated new payment) / income
 *   - downPaymentProgress  → measured against a 10% goal, not home's 20%
 *   - monthlyHousingRatio  → repurposed as the car-payment hard-stop
 */
export function mapCarResponses(
  responses: Record<string, ResponseValue>,
  conflict: ConflictResponses,
): AssessmentInputs {
  const income = num(responses.car_fin_income) ?? 0;
  const debt = num(responses.car_fin_debt_payments) ?? 0;

  // DTI = (existing debt + estimated new payment) / income. The exact payment
  // is unknown (no rate question), so it is derived from the cost band.
  const paymentBand = str(responses.car_fin_monthly_payment) ?? "";
  const estimatedPaymentDollars = income * carPaymentBandToRatio(paymentBand);
  const debtToIncomeRatio = income > 0 ? (debt + estimatedPaymentDollars) / income : 0;

  const downPaymentPercent = carDownPaymentChoiceToPercent(
    str(responses.car_fin_down_payment_amount) ?? "",
  );
  const emergencyFundMonths = carEmergencyChoiceToMonths(
    str(responses.car_fin_emergency_fund) ?? "",
  );
  const creditScore = carCreditChoiceToScore(str(responses.car_fin_credit_score) ?? "");

  // Emotional + timing reuse the shared bank tags, so they reuse home's maps.
  const confidenceLevel = sliderValue(responses.emo_confidence);
  const lifeStability = sliderValue(
    responses.emo_lifestyle_ready,
    sliderValue(responses.emo_clarity),
  );
  const partnerAlignment = partnerChoiceToScale(str(responses.emo_partner_alignment) ?? "solo");
  const fomoLevel = fomoChoiceToScale(str(responses.emo_fomo) ?? "mixed");

  const timeHorizonMonths = timelineChoiceToMonths(str(responses.tim_timeline) ?? "6_12");
  const urgency = sliderValue(responses.tim_urgency, 5);
  const deadlineFromUrgency = urgencyToDeadlineOrigin(urgency);
  // The car bank has no total-savings question, so the rate falls back to the
  // income-only heuristic.
  const savingsRate = estimateSavingsRate(null, income);

  // Car targets a 10% down payment, not home's 20%.
  const tenPercentGoal = 0.1;
  const downPaymentProgress = Math.min(1, downPaymentPercent / tenPercentGoal);

  const monthlyHousingRatio = carPaymentBandToHousingRatio(paymentBand);

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
  car: mapCarResponses,
  // career_change / education / starting_a_business: registered in 5.8+
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
