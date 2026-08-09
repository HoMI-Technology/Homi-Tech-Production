/**
 * Tool Scenarios — Decision Lab Phase 4.
 *
 * A scenario is a named snapshot of one lens's inputs plus the CFM core it
 * was saved against. Three design rules, all canon-driven:
 *
 * 1. STALENESS IS DISPLAYED, NEVER AUTO-REFRESHED. The snapshot anchors the
 *    scenario to the numbers it was saved with. When the user's real numbers
 *    drift, scenarioDrift() names what changed and the UI offers a refresh —
 *    silently rewriting a saved decision's meaning is unacceptable.
 * 2. COMPARISON IS DETERMINISTIC. compareScenarios() reuses the exact
 *    functions the dashboards and lenses use (payment math, housing deltas)
 *    — zero AI calls for the matrix itself.
 * 3. COMPARISON IS SAME-LENS ONLY. "House at $420k" vs "House at $380k"
 *    makes sense; mortgage vs runway does not. lensId travels with the row.
 *
 * Anonymous users get a local-only store (cap: one scenario, labeled
 * "browser only") — same degraded-but-honest contract as the finance store.
 */

import { DEFAULT_FINANCE_STATE, type FinanceState } from "@/lib/finance/store";
import { fullPaymentBreakdown, monthlyPayment } from "@/lib/tools/mortgage";
import {
  computeHousingDeltas,
  computeReplacementDeltas,
  type MetricDelta,
} from "@/lib/tools/deltas";
import type { CanonicalFinancialModel } from "@/lib/tools/cfm";

export interface ScenarioCfmSnapshot {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyDebtPayments: number;
  liquidSavings: number;
  totalDebt: number;
}

export interface ToolScenario {
  id: string;
  name: string;
  lensId: string;
  inputs: Record<string, number>;
  /** Null when saved before any finance data existed — can never go stale. */
  cfmSnapshot: ScenarioCfmSnapshot | null;
  savedAt: string; // ISO
  origin: "local" | "server";
}

export const LOCAL_SCENARIO_CAP = 1;

// ---------------------------------------------------------------------------
// Snapshot + drift
// ---------------------------------------------------------------------------

export function snapshotFromCfm(cfm: CanonicalFinancialModel | null): ScenarioCfmSnapshot | null {
  if (!cfm) return null;
  return {
    monthlyIncome: cfm.core.monthlyIncome.value,
    monthlyExpenses: cfm.core.monthlyExpenses.value,
    monthlyDebtPayments: cfm.core.monthlyDebtPayments.value,
    liquidSavings: cfm.core.liquidSavings.value,
    totalDebt: cfm.core.totalDebt.value,
  };
}

export interface ScenarioDriftField {
  field: keyof ScenarioCfmSnapshot;
  label: string;
  from: number;
  to: number;
}

const DRIFT_LABELS: Record<keyof ScenarioCfmSnapshot, string> = {
  monthlyIncome: "income",
  monthlyExpenses: "expenses",
  monthlyDebtPayments: "debt payments",
  liquidSavings: "savings",
  totalDebt: "total debt",
};

/** What changed between the scenario's anchor and today's CFM. Empty = fresh. */
export function scenarioDrift(
  scenario: ToolScenario,
  cfm: CanonicalFinancialModel | null,
): ScenarioDriftField[] {
  if (!scenario.cfmSnapshot || !cfm) return [];
  const current = snapshotFromCfm(cfm)!;
  const drift: ScenarioDriftField[] = [];
  for (const key of Object.keys(DRIFT_LABELS) as (keyof ScenarioCfmSnapshot)[]) {
    const from = scenario.cfmSnapshot[key];
    const to = current[key];
    if (from !== to) drift.push({ field: key, label: DRIFT_LABELS[key], from, to });
  }
  return drift;
}

// ---------------------------------------------------------------------------
// Deterministic comparison
// ---------------------------------------------------------------------------

/** Rebuilds a FinanceState from a scenario snapshot so the SAME delta
 * functions the dashboard uses can evaluate the scenario. Pure. */
export function snapshotToFinanceState(snapshot: ScenarioCfmSnapshot): FinanceState {
  return {
    ...DEFAULT_FINANCE_STATE,
    monthlyIncome: snapshot.monthlyIncome,
    monthlyExpenses: snapshot.monthlyExpenses,
    monthlyDebtPayments: snapshot.monthlyDebtPayments,
    liquidSavings: snapshot.liquidSavings,
    totalDebt: snapshot.totalDebt,
  };
}

/** The refinance scenario's payment pair, when its inputs are complete. */
function refinancePayments(
  inputs: Record<string, number>,
): { newPayment: number; currentPayment: number } | null {
  const { balance, currentRate, currentTermYears, newRate, newTermYears } = inputs;
  if (
    typeof balance !== "number" ||
    balance <= 0 ||
    typeof currentRate !== "number" ||
    typeof newRate !== "number" ||
    typeof currentTermYears !== "number" ||
    currentTermYears <= 0 ||
    typeof newTermYears !== "number" ||
    newTermYears <= 0
  ) {
    return null;
  }
  return {
    newPayment: monthlyPayment(balance, newRate, newTermYears),
    currentPayment: monthlyPayment(balance, currentRate, currentTermYears),
  };
}

/** Monthly obligation implied by a scenario's inputs, when the lens produces
 * one (housing lenses; refinance contributes its NEW payment). Null for
 * lenses without a monthly obligation — the comparison shows "—" rather
 * than inventing a number. */
export function scenarioMonthlyObligation(scenario: ToolScenario): number | null {
  if (scenario.lensId === "refinance") {
    return refinancePayments(scenario.inputs)?.newPayment ?? null;
  }
  const { price, downPayment, rate, termYears } = scenario.inputs;
  if (
    typeof price !== "number" ||
    typeof rate !== "number" ||
    typeof termYears !== "number" ||
    price <= 0 ||
    termYears <= 0
  ) {
    return null;
  }
  const breakdown = fullPaymentBreakdown(price, {
    rate,
    termYears,
    taxInsuranceRate: (scenario.inputs.taxInsRate ?? 1.5) / 100,
    downPayment: downPayment ?? 0,
    hoaMonthly: scenario.inputs.hoaMonthly ?? 0,
  });
  return breakdown.total;
}

/** The right delta shape per lens: refinance scenarios swap an obligation;
 * everything else with a monthly cost adds one. */
function deltasForScenario(scenario: ToolScenario, finance: FinanceState): MetricDelta[] | null {
  if (scenario.lensId === "refinance") {
    const payments = refinancePayments(scenario.inputs);
    if (!payments) return null;
    return computeReplacementDeltas(finance, {
      newPaymentMonthly: payments.newPayment,
      replacedPaymentMonthly: payments.currentPayment,
    });
  }
  const obligation = scenarioMonthlyObligation(scenario);
  return obligation === null ? null : computeHousingDeltas(finance, obligation);
}

export interface ScenarioEvaluation {
  monthlyCost: number | null;
  runwayAfter: number | null;
  dtiAfter: number | null;
}

/** Evaluates one scenario against its OWN snapshot — the honest frame:
 * "given the numbers you had when you saved this, here's where it lands."
 * Drift is shown separately; the two are never blended silently. */
export function evaluateScenario(scenario: ToolScenario): ScenarioEvaluation {
  const monthlyCost = scenarioMonthlyObligation(scenario);
  if (monthlyCost === null || !scenario.cfmSnapshot || scenario.cfmSnapshot.monthlyIncome <= 0) {
    return { monthlyCost, runwayAfter: null, dtiAfter: null };
  }
  const deltas = deltasForScenario(scenario, snapshotToFinanceState(scenario.cfmSnapshot));
  return {
    monthlyCost,
    runwayAfter: deltas?.find((d) => d.metric === "runway")?.to ?? null,
    dtiAfter: deltas?.find((d) => d.metric === "dti")?.to ?? null,
  };
}

export interface ComparisonRow {
  key: "monthlyCost" | "runwayAfter" | "dtiAfter";
  label: string;
  unit: "currency" | "months" | "percent";
  a: number | null;
  b: number | null;
  /** Which side wins this row, or null for tie / unknown. Lower cost and
   * DTI win; higher runway wins. */
  better: "a" | "b" | null;
}

export function compareScenarios(a: ToolScenario, b: ToolScenario): ComparisonRow[] {
  const ea = evaluateScenario(a);
  const eb = evaluateScenario(b);

  function row(
    key: ComparisonRow["key"],
    label: string,
    unit: ComparisonRow["unit"],
    higherIsBetter: boolean,
  ): ComparisonRow {
    const va = ea[key];
    const vb = eb[key];
    let better: ComparisonRow["better"] = null;
    if (va !== null && vb !== null && va !== vb) {
      const aWins = higherIsBetter ? va > vb : va < vb;
      better = aWins ? "a" : "b";
    }
    return { key, label, unit, a: va, b: vb, better };
  }

  return [
    row("monthlyCost", "Monthly cost", "currency", false),
    row("runwayAfter", "Runway after", "months", true),
    row("dtiAfter", "DTI after", "percent", false),
  ];
}

// ---------------------------------------------------------------------------
// Local (anonymous / offline) store — cap one, labeled "browser only"
// ---------------------------------------------------------------------------

const LOCAL_KEY = "homi:scenarios";

export function loadLocalScenarios(): ToolScenario[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ToolScenario[];
    return Array.isArray(parsed) ? parsed.filter((s) => s && typeof s.id === "string") : [];
  } catch {
    return [];
  }
}

function persistLocal(scenarios: ToolScenario[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(scenarios));
  } catch {
    // storage unavailable — session-only
  }
}

/** Local save honors the anonymous cap: at the cap, the oldest is replaced
 * (the user explicitly chose to save a new one; nothing is silently lost —
 * the button reports the replacement). */
export function saveLocalScenario(scenario: Omit<ToolScenario, "id" | "savedAt" | "origin">): {
  scenario: ToolScenario;
  replaced: ToolScenario | null;
} {
  const existing = loadLocalScenarios();
  const full: ToolScenario = {
    ...scenario,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    origin: "local",
  };
  let replaced: ToolScenario | null = null;
  let next = [...existing, full];
  if (next.length > LOCAL_SCENARIO_CAP) {
    replaced = next[0];
    next = next.slice(next.length - LOCAL_SCENARIO_CAP);
  }
  persistLocal(next);
  return { scenario: full, replaced };
}

export function deleteLocalScenario(id: string): void {
  persistLocal(loadLocalScenarios().filter((s) => s.id !== id));
}
