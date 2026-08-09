/**
 * Lens impact deltas — Decision Lab Phase 1.
 *
 * Deterministic "what does this change for me" math. When a lens computes
 * a new monthly obligation (a mortgage payment, a refinanced payment, a
 * debt payoff plan), these functions diff it against the user's saved
 * finance state and return before/after values for the two stability
 * metrics the dashboard already tracks: runway and DTI.
 *
 * Canon: this is the ONLY place lens-impact arithmetic happens. The
 * Companion receives these numbers precomputed in its lens digest and
 * reads them — it never recomputes them.
 *
 * Two shapes exist, and they are not interchangeable:
 * - computeHousingDeltas: a NEW obligation (optionally replacing rent).
 * - computeReplacementDeltas: an EXISTING obligation swapped for a new
 *   one (refinance). Passing a replacement through the new-obligation
 *   shape would stack payments that never coexist — the dishonest
 *   direction.
 */

import {
  runwayMonths,
  debtToIncome,
  runwayTemperature,
  dtiTemperature,
  type FinanceState,
  type Temperature,
} from "@/lib/finance/store";

export type DeltaMetric = "runway" | "dti";

export interface MetricDelta {
  metric: DeltaMetric;
  label: string;
  unit: "months" | "percent";
  from: number;
  to: number;
  fromTemperature: Temperature;
  toTemperature: Temperature;
  /** true = the move helps, false = it hurts, null = flat. Never hidden —
   * radical honesty means a negative delta renders exactly like a positive. */
  improved: boolean | null;
}

export interface HousingDeltaOptions {
  /** When the new obligation replaces rent, pass the current monthly rent
   * so it leaves the outflow instead of stacking on top of it. */
  replacedRentMonthly?: number;
}

export interface ReplacementDeltaOptions {
  /** The new monthly payment after the swap (e.g. refinanced P&I). */
  newPaymentMonthly: number;
  /** The monthly payment being replaced (e.g. current P&I). Capped at the
   * user's total current outflow — we never claim more relief than their
   * own numbers support. */
  replacedPaymentMonthly: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** The single arithmetic core both public shapes delegate to. */
function diffObligation(
  finance: FinanceState,
  newObligation: number,
  replaced: number,
): MetricDelta[] {
  // --- Runway ---
  const fromRunway = runwayMonths(finance);
  const toOutflow =
    finance.monthlyExpenses - replaced + finance.monthlyDebtPayments + newObligation;
  const toRunway = toOutflow > 0 ? finance.liquidSavings / toOutflow : Infinity;

  // --- DTI ---
  const fromDti = debtToIncome(finance);
  const toDti =
    ((finance.monthlyDebtPayments + newObligation - replaced) / finance.monthlyIncome) * 100;

  return [
    {
      metric: "runway",
      label: "Emergency runway",
      unit: "months",
      from: round1(fromRunway),
      to: round1(toRunway),
      fromTemperature: runwayTemperature(fromRunway),
      toTemperature: runwayTemperature(toRunway),
      improved: toRunway > fromRunway ? true : toRunway < fromRunway ? false : null,
    },
    {
      metric: "dti",
      label: "Debt-to-income",
      unit: "percent",
      from: round1(fromDti),
      to: round1(Math.max(0, toDti)),
      fromTemperature: dtiTemperature(fromDti),
      toTemperature: dtiTemperature(Math.max(0, toDti)),
      improved: toDti < fromDti ? true : toDti > fromDti ? false : null,
    },
  ];
}

/**
 * Diffs a proposed monthly housing obligation against the user's current
 * numbers. Returns null when there is no usable income — a missing-data
 * signal the UI must surface rather than a zero it must hide.
 *
 * Pure: pass the finance state explicitly so tests need no storage.
 */
export function computeHousingDeltas(
  finance: FinanceState,
  newMonthlyObligation: number,
  opts: HousingDeltaOptions = {},
): MetricDelta[] | null {
  if (finance.monthlyIncome <= 0) return null;
  if (!Number.isFinite(newMonthlyObligation) || newMonthlyObligation < 0) return null;

  const replacedRent = Math.max(0, opts.replacedRentMonthly ?? 0);
  return diffObligation(finance, newMonthlyObligation, replacedRent);
}

/**
 * Diffs a REPLACEMENT swap: an obligation the user already carries (their
 * current mortgage payment) is exchanged for a new one (the refinanced
 * payment). Only the difference touches their runway and DTI.
 *
 * Honesty guards:
 * - The replaced amount is capped at the user's total current outflow —
 *   a swap can never "free up" more than they actually spend.
 * - Null when income is missing or either payment is nonsensical.
 */
export function computeReplacementDeltas(
  finance: FinanceState,
  opts: ReplacementDeltaOptions,
): MetricDelta[] | null {
  if (finance.monthlyIncome <= 0) return null;
  const { newPaymentMonthly, replacedPaymentMonthly } = opts;
  if (!Number.isFinite(newPaymentMonthly) || newPaymentMonthly < 0) return null;
  if (!Number.isFinite(replacedPaymentMonthly) || replacedPaymentMonthly < 0) return null;

  const maxReplaceable = finance.monthlyExpenses + finance.monthlyDebtPayments;
  const replaced = Math.min(replacedPaymentMonthly, maxReplaceable);
  return diffObligation(finance, newPaymentMonthly, replaced);
}

/** Worst temperature across a delta set — drives the card accent so a
 * single bad move is never visually buried by a good one. */
export function worstDeltaTemperature(deltas: MetricDelta[]): Temperature {
  const order: Temperature[] = ["emerald", "yellow", "amber", "crimson"];
  return deltas.reduce<Temperature>(
    (worst, d) => (order.indexOf(d.toTemperature) > order.indexOf(worst) ? d.toTemperature : worst),
    "emerald",
  );
}
