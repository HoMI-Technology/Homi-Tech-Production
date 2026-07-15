/**
 * Readiness-score simulator — pure math for the /simulator page.
 *
 * Every score here comes from the canonical engine (lib/scoring/engine.ts via
 * computeScore / scoreToVerdict) — this module never reimplements thresholds
 * or point tables. It only:
 *
 *   1. Seeds a baseline from the user's own data, in priority order:
 *      latest financial_snapshots.state (plaid_sync) → manual Finance
 *      dashboard state (localStorage "homi:finance") → zeros.
 *   2. Translates the four money levers (income, expenses, liquid savings,
 *      total debt) into the engine's financial-pillar inputs.
 *   3. Holds the emotional and timing pillars — plus the financial inputs the
 *      levers cannot reach (credit score, down-payment percent) — at the
 *      user's latest assessment values (neutral placeholders when no
 *      assessment exists; outcomes carry a `neutral` flag so the UI labels it).
 *
 * HONESTY RULES the UI relies on:
 *   • When actual monthly debt payments are unknown (Plaid snapshots carry
 *     balances, not payment schedules) they are ESTIMATED at
 *     ESTIMATED_DEBT_PAYMENT_RATE of the balance and every outcome flags
 *     `debtPaymentsEstimated` so the UI says so.
 *   • Only the financial pillar is simulated; the composite moves solely
 *     through it. The UI must state that the other two pillars are held.
 */

import {
  computeScore,
  scoreToVerdict,
  type AssessmentInputs,
  type FinancialBreakdown,
  type HardStopReason,
  type Verdict,
} from "@/lib/scoring";
import type { FinanceState } from "@/lib/finance/store";

// ---------------------------------------------------------------------------
// Levers + baseline
// ---------------------------------------------------------------------------

/** The four money levers the simulator exposes. */
export interface SimulatorLevers {
  monthlyIncome: number;
  monthlyExpenses: number;
  liquidSavings: number;
  totalDebt: number;
}

export type BaselineSource = "plaid_sync" | "manual" | "empty";

export interface SimulatorBaseline extends SimulatorLevers {
  source: BaselineSource;
  /**
   * Actual monthly debt payments when the baseline knows them (manual Finance
   * state). null → payments are estimated from the balance (Plaid snapshots
   * report balances only).
   */
  monthlyDebtPayments: number | null;
}

/** Balance share used to estimate monthly debt payments when unknown. */
export const ESTIMATED_DEBT_PAYMENT_RATE = 0.02;

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Parses a financial_snapshots.state written by lib/plaid/sync.ts. Returns
 * null unless the payload is a plaid_sync snapshot with all four money
 * figures present — a malformed row must fall through to the next seed.
 */
export function parseSnapshotState(state: unknown): SimulatorLevers | null {
  if (typeof state !== "object" || state === null) return null;
  const record = state as Record<string, unknown>;
  if (record.source !== "plaid_sync") return null;
  const monthlyIncome = finiteOrNull(record.monthlyIncome);
  const monthlyExpenses = finiteOrNull(record.monthlyExpenses);
  const liquidSavings = finiteOrNull(record.liquidSavings);
  const totalDebt = finiteOrNull(record.totalDebt);
  if (monthlyIncome === null || monthlyExpenses === null || liquidSavings === null || totalDebt === null) {
    return null;
  }
  return { monthlyIncome, monthlyExpenses, liquidSavings, totalDebt };
}

/**
 * Seeds the simulator baseline in the documented priority order:
 * plaid_sync snapshot state → manual finance state → zeros ("empty").
 */
export function seedBaseline(
  snapshotState: unknown,
  financeState: Pick<
    FinanceState,
    "monthlyIncome" | "monthlyExpenses" | "liquidSavings" | "totalDebt" | "monthlyDebtPayments"
  > | null,
): SimulatorBaseline {
  const fromSnapshot = parseSnapshotState(snapshotState);
  if (fromSnapshot) {
    return { ...fromSnapshot, source: "plaid_sync", monthlyDebtPayments: null };
  }
  if (financeState) {
    return {
      monthlyIncome: financeState.monthlyIncome,
      monthlyExpenses: financeState.monthlyExpenses,
      liquidSavings: financeState.liquidSavings,
      totalDebt: financeState.totalDebt,
      monthlyDebtPayments: financeState.monthlyDebtPayments,
      source: "manual",
    };
  }
  return {
    monthlyIncome: 0,
    monthlyExpenses: 0,
    liquidSavings: 0,
    totalDebt: 0,
    monthlyDebtPayments: null,
    source: "empty",
  };
}

// ---------------------------------------------------------------------------
// Anchors — everything the levers do NOT move
// ---------------------------------------------------------------------------

export interface SimulatorAnchors {
  /** Emotional pillar held constant (0-35). */
  emotionalScore: number;
  /** Timing pillar held constant (0-30). */
  timingScore: number;
  /** Financial inputs the levers cannot derive. */
  creditScore: number;
  downPaymentPercent: number;
  /** Full stored assessment inputs when available (keeps e.g. the housing-ratio guard honest). */
  inputs: AssessmentInputs | null;
  /** True when no completed assessment existed and neutral placeholders are in play. */
  neutral: boolean;
}

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

/** Minimal shape of the latest completed assessment the simulator anchors to. */
export interface AnchorAssessment {
  emotional_score: number | null;
  timing_score: number | null;
  inputs: Record<string, unknown> | null;
}

function looksLikeAssessmentInputs(value: Record<string, unknown> | null): value is Record<string, unknown> & AssessmentInputs {
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
    assessment && looksLikeAssessmentInputs(assessment.inputs) ? (assessment.inputs as AssessmentInputs) : null;

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

export interface SimulationOutcome {
  /** Financial Reality pillar under these levers (0-35). */
  financialScore: number;
  financial: FinancialBreakdown;
  /** Composite = simulated financial + held emotional + held timing (0-100). */
  compositeScore: number;
  verdict: Verdict;
  hardStops: HardStopReason[];
  /** The monthly debt payments the DTI read used. */
  monthlyDebtPayments: number;
  /** True when payments were estimated from the balance, not known. */
  debtPaymentsEstimated: boolean;
  /** Derived inputs, surfaced so the UI can show its work. */
  derived: {
    debtToIncomeRatio: number;
    emergencyFundMonths: number;
  };
}

/**
 * Monthly debt payments for a lever position. Known baseline payments scale
 * proportionally with the balance ("pay off half the debt, halve the
 * payment"); unknown payments are estimated from the balance and flagged.
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
): SimulationOutcome {
  const payments = deriveDebtPayments(levers.totalDebt, baseline);
  const debtToIncomeRatio = levers.monthlyIncome > 0 ? payments.amount / levers.monthlyIncome : 0;
  // Runway counts debt payments as outflow, matching lib/finance/store.
  const outflow = Math.max(0, levers.monthlyExpenses) + payments.amount;
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
  const verdict: Verdict = result.hardStops.length > 0 ? "NOT_YET" : scoreToVerdict(compositeScore);

  return {
    financialScore: result.financial.total,
    financial: result.financial,
    compositeScore,
    verdict,
    hardStops: result.hardStops,
    monthlyDebtPayments: payments.amount,
    debtPaymentsEstimated: payments.estimated,
    derived: { debtToIncomeRatio, emergencyFundMonths },
  };
}

// ---------------------------------------------------------------------------
// Scenario shortcuts
// ---------------------------------------------------------------------------

/**
 * "Pay off $X of debt" — pays from liquid savings, so it can never pay more
 * than the debt owed or the savings available.
 */
export function applyDebtPayoff(levers: SimulatorLevers, amount: number): SimulatorLevers {
  const paid = Math.max(0, Math.min(amount, levers.totalDebt, levers.liquidSavings));
  return { ...levers, totalDebt: levers.totalDebt - paid, liquidSavings: levers.liquidSavings - paid };
}

/** "Save $Y/mo for N months" — adds the plan's total to liquid savings. */
export function applySavingsPlan(levers: SimulatorLevers, perMonth: number, months: number): SimulatorLevers {
  const added = Math.max(0, perMonth) * Math.max(0, Math.round(months));
  return { ...levers, liquidSavings: levers.liquidSavings + added };
}

// ---------------------------------------------------------------------------
// Lever ranking
// ---------------------------------------------------------------------------

export type LeverKey = keyof SimulatorLevers;

export const LEVER_LABELS: Record<LeverKey, string> = {
  monthlyIncome: "Monthly income",
  monthlyExpenses: "Monthly expenses",
  liquidSavings: "Liquid savings",
  totalDebt: "Total debt",
};

export interface LeverImpact {
  key: LeverKey;
  label: string;
  /** Composite-score points this lever's change contributes on its own. */
  delta: number;
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
