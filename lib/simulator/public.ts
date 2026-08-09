/**
 * Client-safe simulator surface (Plans.md 6.4).
 *
 * Pure seed/scenario helpers + shared types. Does NOT import the scoring
 * engine — clients may value-import this module. Engine-backed simulate /
 * deriveAnchors / rankLevers live in lib/simulator.ts and run only via
 * POST /api/simulator (or server tests).
 */

import type {
  AssessmentInputs,
  FinancialBreakdown,
  HardStopReason,
  Verdict,
} from "@/lib/scoring/public";
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
  if (
    monthlyIncome === null ||
    monthlyExpenses === null ||
    liquidSavings === null ||
    totalDebt === null
  ) {
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
// Anchors + outcomes (types only on the client)
// ---------------------------------------------------------------------------

export interface SimulatorAnchors {
  /** Emotional pillar held constant (0-35). */
  emotionalScore: number;
  /** Timing pillar held constant (0-30). */
  timingScore: number;
  /** Financial inputs the levers cannot derive. */
  creditScore: number;
  downPaymentPercent: number;
  /** Full stored assessment inputs when available. */
  inputs: AssessmentInputs | null;
  /** True when no completed assessment existed and neutral placeholders are in play. */
  neutral: boolean;
}

/** Minimal shape of the latest completed assessment the simulator anchors to. */
export interface AnchorAssessment {
  emotional_score: number | null;
  timing_score: number | null;
  inputs: Record<string, unknown> | null;
}

export interface SimulationOutcome {
  financialScore: number;
  financial: FinancialBreakdown;
  compositeScore: number;
  verdict: Verdict;
  hardStops: HardStopReason[];
  monthlyDebtPayments: number;
  debtPaymentsEstimated: boolean;
  derived: {
    debtToIncomeRatio: number;
    emergencyFundMonths: number;
  };
}

export interface SimulateOptions {
  extraDebtService?: number;
}

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
  delta: number;
}

// ---------------------------------------------------------------------------
// Scenario shortcuts (pure — no engine)
// ---------------------------------------------------------------------------

/**
 * "Pay off $X of debt" — pays from liquid savings, so it can never pay more
 * than the debt owed or the savings available.
 */
export function applyDebtPayoff(levers: SimulatorLevers, amount: number): SimulatorLevers {
  const paid = Math.max(0, Math.min(amount, levers.totalDebt, levers.liquidSavings));
  return {
    ...levers,
    totalDebt: levers.totalDebt - paid,
    liquidSavings: levers.liquidSavings - paid,
  };
}

/** "Save $Y/mo for N months" — adds the plan's total to liquid savings. */
export function applySavingsPlan(
  levers: SimulatorLevers,
  perMonth: number,
  months: number,
): SimulatorLevers {
  const added = Math.max(0, perMonth) * Math.max(0, Math.round(months));
  return { ...levers, liquidSavings: levers.liquidSavings + added };
}

/** Baseline money levers only (no source / payment metadata). */
export function leversOf(baseline: SimulatorBaseline): SimulatorLevers {
  return {
    monthlyIncome: baseline.monthlyIncome,
    monthlyExpenses: baseline.monthlyExpenses,
    liquidSavings: baseline.liquidSavings,
    totalDebt: baseline.totalDebt,
  };
}
