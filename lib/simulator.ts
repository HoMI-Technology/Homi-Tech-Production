import "server-only";

/**
 * Readiness-score simulator — pure seed helpers + engine-backed simulate.
 *
 * Client components must NOT value-import this module (Plans.md 6.4 / 6.5).
 * Use `@/lib/simulator/public` for types/seed/scenario shortcuts and
 * `POST /api/simulator` (or `@/lib/simulator/client`) for scores.
 *
 * Every score here comes from the canonical engine (lib/scoring/engine.ts via
 * computeScore / scoreToVerdict) — this module never reimplements thresholds
 * or point tables. It only:
 *
 *   1. Seeds a baseline from the user's own data (public helpers).
 *   2. Translates the four money levers into the engine's financial inputs.
 *   3. Holds emotional/timing pillars at the latest assessment (or neutral).
 *
 * HONESTY RULES the UI relies on:
 *   • When actual monthly debt payments are unknown they are ESTIMATED at
 *     ESTIMATED_DEBT_PAYMENT_RATE of the balance and every outcome flags
 *     `debtPaymentsEstimated` so the UI says so.
 *   • Only the financial pillar is simulated; the composite moves solely
 *     through it.
 */

import { computeScore } from "@/lib/scoring/engine";
import { scoreToVerdict, type AssessmentInputs } from "@/lib/scoring/public";

export {
  applyDebtPayoff,
  applySavingsPlan,
  ESTIMATED_DEBT_PAYMENT_RATE,
  LEVER_LABELS,
  leversOf,
  parseSnapshotState,
  seedBaseline,
  type AnchorAssessment,
  type BaselineSource,
  type LeverImpact,
  type LeverKey,
  type SimulateOptions,
  type SimulationOutcome,
  type SimulatorAnchors,
  type SimulatorBaseline,
  type SimulatorLevers,
} from "./simulator/public";

import {
  ESTIMATED_DEBT_PAYMENT_RATE,
  LEVER_LABELS,
  type AnchorAssessment,
  type LeverImpact,
  type LeverKey,
  type SimulateOptions,
  type SimulationOutcome,
  type SimulatorAnchors,
  type SimulatorBaseline,
  type SimulatorLevers,
} from "./simulator/public";

// ---------------------------------------------------------------------------
// Anchors — everything the levers do NOT move
// ---------------------------------------------------------------------------

/**
 * Neutral placeholder inputs used only when the user has no completed
 * assessment: mid-scale sliders, a credit score above every hard-stop line,
 * and the same fill-ins the Shadow Score uses. Purely a stand-in so the
 * composite is computable — the UI labels it.
 */
export const NEUTRAL_INPUTS: AssessmentInputs = {
  debtToIncomeRatio: 0,
  downPaymentPercent: 0.1,
  emergencyFundMonths: 0,
  creditScore: 700,
  lifeStability: 6,
  confidenceLevel: 6,
  partnerAlignment: null,
  fomoLevel: 5,
  timeHorizonMonths: 12,
  savingsRate: 0.1,
  downPaymentProgress: 0.4,
};

function looksLikeAssessmentInputs(
  value: Record<string, unknown> | null,
): value is Record<string, unknown> & AssessmentInputs {
  if (!value) return false;
  return (
    typeof value.debtToIncomeRatio === "number" &&
    typeof value.creditScore === "number" &&
    typeof value.lifeStability === "number"
  );
}

/**
 * Builds the held-constant anchors from the user's latest completed
 * assessment, or from NEUTRAL_INPUTS when none exists.
 */
export function deriveAnchors(assessment: AnchorAssessment | null): SimulatorAnchors {
  const storedInputs =
    assessment && looksLikeAssessmentInputs(assessment.inputs)
      ? (assessment.inputs as AssessmentInputs)
      : null;

  if (assessment && storedInputs) {
    const recomputed = computeScore(storedInputs);
    return {
      emotionalScore: Math.round(assessment.emotional_score ?? recomputed.emotional.total),
      timingScore: Math.round(assessment.timing_score ?? recomputed.timing.total),
      creditScore: storedInputs.creditScore,
      downPaymentPercent: storedInputs.downPaymentPercent,
      inputs: storedInputs,
      neutral: false,
    };
  }

  const neutral = computeScore(NEUTRAL_INPUTS);
  return {
    emotionalScore: neutral.emotional.total,
    timingScore: neutral.timing.total,
    creditScore: NEUTRAL_INPUTS.creditScore,
    downPaymentPercent: NEUTRAL_INPUTS.downPaymentPercent,
    inputs: null,
    neutral: true,
  };
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

/**
 * Monthly debt payments for a lever position. Known baseline payments scale
 * proportionally with the balance; unknown payments are estimated and flagged.
 */
export function deriveDebtPayments(
  totalDebt: number,
  baseline: Pick<SimulatorBaseline, "totalDebt" | "monthlyDebtPayments">,
): { amount: number; estimated: boolean } {
  const debt = Math.max(0, totalDebt);
  if (baseline.monthlyDebtPayments !== null && baseline.totalDebt > 0) {
    return { amount: baseline.monthlyDebtPayments * (debt / baseline.totalDebt), estimated: false };
  }
  if (baseline.monthlyDebtPayments !== null && debt === 0) {
    return { amount: 0, estimated: false };
  }
  return { amount: debt * ESTIMATED_DEBT_PAYMENT_RATE, estimated: true };
}

/**
 * Runs the canonical engine for one lever position. Only the financial
 * pillar is taken from the run; emotional and timing come from the anchors.
 */
export function simulate(
  levers: SimulatorLevers,
  baseline: SimulatorBaseline,
  anchors: SimulatorAnchors,
  opts: SimulateOptions = {},
): SimulationOutcome {
  const payments = deriveDebtPayments(levers.totalDebt, baseline);
  const extra = Math.max(0, opts.extraDebtService ?? 0);
  const totalPayments = payments.amount + extra;
  const debtToIncomeRatio = levers.monthlyIncome > 0 ? totalPayments / levers.monthlyIncome : 0;
  const outflow = Math.max(0, levers.monthlyExpenses) + totalPayments;
  const emergencyFundMonths = outflow > 0 ? Math.max(0, levers.liquidSavings) / outflow : 0;

  const result = computeScore({
    ...(anchors.inputs ?? NEUTRAL_INPUTS),
    debtToIncomeRatio,
    emergencyFundMonths,
    creditScore: anchors.creditScore,
    downPaymentPercent: anchors.downPaymentPercent,
  });

  const compositeScore = Math.max(
    0,
    Math.min(100, result.financial.total + anchors.emotionalScore + anchors.timingScore),
  );
  const verdict: SimulationOutcome["verdict"] =
    result.hardStops.length > 0 ? "NOT_YET" : scoreToVerdict(compositeScore);

  return {
    financialScore: result.financial.total,
    financial: result.financial,
    compositeScore,
    verdict,
    hardStops: result.hardStops,
    monthlyDebtPayments: totalPayments,
    debtPaymentsEstimated: payments.estimated,
    derived: { debtToIncomeRatio, emergencyFundMonths },
  };
}

/**
 * Ranks the levers the user moved by marginal impact: each changed lever is
 * applied to the baseline ALONE and its composite delta measured, largest
 * absolute effect first. Unchanged levers are omitted.
 */
export function rankLevers(
  levers: SimulatorLevers,
  baseline: SimulatorBaseline,
  anchors: SimulatorAnchors,
): LeverImpact[] {
  const baseComposite = simulate(baseline, baseline, anchors).compositeScore;
  const impacts: LeverImpact[] = [];
  for (const key of Object.keys(LEVER_LABELS) as LeverKey[]) {
    if (levers[key] === baseline[key]) continue;
    const solo = simulate({ ...baseline, [key]: levers[key] }, baseline, anchors);
    impacts.push({ key, label: LEVER_LABELS[key], delta: solo.compositeScore - baseComposite });
  }
  return impacts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
