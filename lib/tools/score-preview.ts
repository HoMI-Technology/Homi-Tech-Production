/**
 * Score Impact Preview — projected HōMI Score for tool hypotheticals.
 *
 * Client-safe module (Section 5). It never imports the scoring engine:
 * projections are computed by the server via fetchServerScore → POST
 * /api/scoring, exactly like the assessment flows (Plans.md 6.2 / 6.5).
 * The baseline is the stored assessment result (already server-computed),
 * so a preview costs exactly one scoring call.
 *
 * Honesty contract: a preview is a "what if" on top of the user's last
 * assessment inputs — never a new score. UI must label it with
 * SCORE_IMPACT_PROJECTED_LABEL and never persist it as a result.
 */

import type { AssessmentInputs, Verdict } from "@/lib/scoring/public";
import { fetchServerScore } from "@/lib/scoring/client-score";
import type { FinanceState } from "@/lib/finance/store";

/** Rendered verbatim next to every preview — do not paraphrase. */
export const SCORE_IMPACT_PROJECTED_LABEL = "Projected — re-take the assessment to confirm";

/** Subset of assessment inputs a tool hypothetical may move. */
export interface ScoreProjectionOverrides {
  debtToIncomeRatio?: number;
  emergencyFundMonths?: number;
  downPaymentPercent?: number;
  savingsRate?: number;
  downPaymentProgress?: number;
  monthlyHousingRatio?: number;
}

export interface ScoreImpactPreview {
  baseline: { score: number; verdict: Verdict };
  projected: { score: number; verdict: Verdict };
  /** Projected minus baseline, in whole points. */
  delta: number;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function clampMonths(v: number): number {
  return Math.min(120, Math.max(0, v));
}

/** monthlyHousingRatio allows up to 2 in the schema (lib/validation/assessment.ts). */
function clampHousingRatio(v: number): number {
  return Math.min(2, Math.max(0, v));
}

/**
 * Clamps a candidate override into the schema bounds (lib/validation/
 * assessment.ts) and drops non-finite / unchanged values, so a preview
 * never posts a no-op or an out-of-range input.
 */
export function buildProjectedInputs(
  baseline: AssessmentInputs,
  overrides: ScoreProjectionOverrides,
): AssessmentInputs {
  const projected = { ...baseline };
  if (
    typeof overrides.debtToIncomeRatio === "number" &&
    Number.isFinite(overrides.debtToIncomeRatio)
  ) {
    projected.debtToIncomeRatio = clamp01(overrides.debtToIncomeRatio);
  }
  if (
    typeof overrides.emergencyFundMonths === "number" &&
    Number.isFinite(overrides.emergencyFundMonths)
  ) {
    projected.emergencyFundMonths = clampMonths(overrides.emergencyFundMonths);
  }
  if (
    typeof overrides.downPaymentPercent === "number" &&
    Number.isFinite(overrides.downPaymentPercent)
  ) {
    projected.downPaymentPercent = clamp01(overrides.downPaymentPercent);
  }
  if (typeof overrides.savingsRate === "number" && Number.isFinite(overrides.savingsRate)) {
    projected.savingsRate = clamp01(overrides.savingsRate);
  }
  if (
    typeof overrides.downPaymentProgress === "number" &&
    Number.isFinite(overrides.downPaymentProgress)
  ) {
    projected.downPaymentProgress = clamp01(overrides.downPaymentProgress);
  }
  if (
    typeof overrides.monthlyHousingRatio === "number" &&
    Number.isFinite(overrides.monthlyHousingRatio)
  ) {
    projected.monthlyHousingRatio = clampHousingRatio(overrides.monthlyHousingRatio);
  }
  return projected;
}

/**
 * Debt-payoff projection: the plan is finished, so the debts' minimum
 * payments are freed. DTI improves by freed / income against the baseline
 * assessment ratio; runway improves because the same savings now cover a
 * smaller monthly outflow (only applied when it actually improves and the
 * finance numbers exist to support it — never invented).
 *
 * Returns null when the projection cannot be grounded (no income on file
 * or nothing freed), so the UI shows nothing rather than a made-up delta.
 */
export function debtPayoffOverrides(
  baseline: AssessmentInputs,
  finance: FinanceState,
  freedMonthlyPayments: number,
): ScoreProjectionOverrides | null {
  if (!Number.isFinite(freedMonthlyPayments) || freedMonthlyPayments <= 0) return null;
  if (!Number.isFinite(finance.monthlyIncome) || finance.monthlyIncome <= 0) return null;

  const overrides: ScoreProjectionOverrides = {
    debtToIncomeRatio: clamp01(
      baseline.debtToIncomeRatio - freedMonthlyPayments / finance.monthlyIncome,
    ),
  };

  const outflow = finance.monthlyExpenses + finance.monthlyDebtPayments;
  const newOutflow = outflow - freedMonthlyPayments;
  if (finance.liquidSavings > 0 && newOutflow > 0) {
    const months = finance.liquidSavings / newOutflow;
    if (months > baseline.emergencyFundMonths) {
      overrides.emergencyFundMonths = clampMonths(months);
    }
  }
  return overrides;
}

/**
 * Runway projection: "what if my emergency fund were the months this tool
 * currently shows". Returns null when the tool's number already matches
 * the assessed runway — nothing to preview.
 */
export function runwayOverrides(
  baseline: AssessmentInputs,
  runwayMonths: number,
): ScoreProjectionOverrides | null {
  if (!Number.isFinite(runwayMonths) || runwayMonths < 0) return null;
  const months = clampMonths(runwayMonths);
  if (Math.abs(months - baseline.emergencyFundMonths) < 0.05) return null;
  return { emergencyFundMonths: months };
}

/**
 * Affordability projection: "what if I bought at the tier price this tool
 * shows, with this down payment". The tier payment becomes the projected
 * housing ratio and the down payment becomes the projected
 * downPaymentPercent — each only when it improves on the assessed value
 * (a baseline without a housing ratio gains nothing from one below the
 * 0.45 hard stop, so it is not invented there).
 *
 * Returns null when the projection cannot be grounded (no income or no
 * price) or when neither input improves — the UI shows nothing rather
 * than a made-up delta.
 */
export function affordabilityOverrides(
  baseline: AssessmentInputs,
  scenario: {
    monthlyIncome: number;
    monthlyHousing: number;
    downPayment: number;
    homePrice: number;
  },
): ScoreProjectionOverrides | null {
  const { monthlyIncome, monthlyHousing, downPayment, homePrice } = scenario;
  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) return null;
  if (!Number.isFinite(homePrice) || homePrice <= 0) return null;

  const overrides: ScoreProjectionOverrides = {};

  if (Number.isFinite(monthlyHousing) && monthlyHousing > 0) {
    const ratio = monthlyHousing / monthlyIncome;
    if (baseline.monthlyHousingRatio !== undefined && ratio < baseline.monthlyHousingRatio) {
      overrides.monthlyHousingRatio = clampHousingRatio(ratio);
    }
  }

  if (Number.isFinite(downPayment) && downPayment > 0) {
    const percent = downPayment / homePrice;
    if (percent > baseline.downPaymentPercent) {
      overrides.downPaymentPercent = clamp01(percent);
    }
  }

  return Object.keys(overrides).length > 0 ? overrides : null;
}

/**
 * Down-payment projection: "what if I reach the goal at this pace". The
 * saved share of the goal becomes downPaymentProgress and the monthly
 * contribution becomes savingsRate — each only when it improves on the
 * assessed value, and only when the numbers exist to support it (goal
 * above zero for progress, real income on file for the savings rate).
 *
 * Returns null when neither input can be grounded as an improvement.
 */
export function downPaymentOverrides(
  baseline: AssessmentInputs,
  scenario: {
    goal: number;
    saved: number;
    monthly: number;
    monthlyIncome: number;
  },
): ScoreProjectionOverrides | null {
  const { goal, saved, monthly, monthlyIncome } = scenario;

  const overrides: ScoreProjectionOverrides = {};

  if (Number.isFinite(goal) && goal > 0 && Number.isFinite(saved) && saved > 0) {
    const progress = clamp01(saved / goal);
    if (progress > baseline.downPaymentProgress) {
      overrides.downPaymentProgress = progress;
    }
  }

  if (
    Number.isFinite(monthlyIncome) &&
    monthlyIncome > 0 &&
    Number.isFinite(monthly) &&
    monthly > 0
  ) {
    const rate = clamp01(monthly / monthlyIncome);
    if (rate > baseline.savingsRate) {
      overrides.savingsRate = rate;
    }
  }

  return Object.keys(overrides).length > 0 ? overrides : null;
}

/**
 * Blind Budget projection: "what if the worst-case end of my bands were
 * true". Uses only the honest ends — least income against highest fixed
 * costs for the savings rate, least savings against highest fixed costs
 * for the runway — never the flattering end. Either number may project
 * lower than the assessment; that is the point of a worst case.
 *
 * Returns null when the bands cannot be grounded (no income or no fixed
 * costs) or when both already match the assessed values.
 */
export function blindBudgetOverrides(
  baseline: AssessmentInputs,
  inputs: {
    incomeLow: number;
    fixedCostsHigh: number;
    savingsLow: number;
  },
): ScoreProjectionOverrides | null {
  const { incomeLow, fixedCostsHigh, savingsLow } = inputs;
  if (!Number.isFinite(incomeLow) || incomeLow <= 0) return null;
  if (!Number.isFinite(fixedCostsHigh) || fixedCostsHigh <= 0) return null;

  const overrides: ScoreProjectionOverrides = {};

  const rate = clamp01(Math.max(0, incomeLow - fixedCostsHigh) / incomeLow);
  if (Math.abs(rate - baseline.savingsRate) >= 0.005) {
    overrides.savingsRate = rate;
  }

  if (Number.isFinite(savingsLow) && savingsLow >= 0) {
    const months = clampMonths(savingsLow / fixedCostsHigh);
    if (Math.abs(months - baseline.emergencyFundMonths) >= 0.05) {
      overrides.emergencyFundMonths = months;
    }
  }

  return Object.keys(overrides).length > 0 ? overrides : null;
}

/**
 * Scores the projected inputs on the server and compares against the
 * stored (already server-computed) baseline result. Throws
 * ScoringRequestError on failure — callers must show an honest error
 * state, never an invented number.
 */
export async function previewScoreImpact(
  baselineInputs: AssessmentInputs,
  baselineResult: { score: number; verdict: Verdict },
  overrides: ScoreProjectionOverrides,
): Promise<ScoreImpactPreview> {
  const projected = buildProjectedInputs(baselineInputs, overrides);
  const { result } = await fetchServerScore(projected);
  const baseScore = Math.round(baselineResult.score);
  const projectedScore = Math.round(result.score);
  return {
    baseline: { score: baseScore, verdict: baselineResult.verdict },
    projected: { score: projectedScore, verdict: result.verdict },
    delta: projectedScore - baseScore,
  };
}
