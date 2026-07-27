/**
 * Scenario studio — readiness-aware buy-now vs wait comparison.
 * Wraps decisions simulation + optional score snapshot. Educational only.
 */

import {
  DEFAULT_SIMULATION_INPUTS,
  simulateAllScenarios,
  type ScenarioOutcome,
  type SimulationInputs,
} from "@/lib/decisions/simulate";
import type { Verdict } from "@/lib/scoring";

export interface ScenarioStudioInput extends SimulationInputs {
  /** Current readiness verdict for honesty chrome */
  readinessVerdict?: Verdict | null;
  readinessScore?: number | null;
}

export interface ScenarioStudioResult {
  scenarios: ScenarioOutcome[];
  bestKey: string;
  bestLabel: string;
  spreadAt60: number;
  readinessNote: string;
  disclaimer: string;
}

export const SCENARIO_DISCLAIMER =
  "Educational model only — not a forecast, appraisal, or lending decision. " +
  "Net position is a simplified 5-year illustration.";

export function runScenarioStudio(
  input: ScenarioStudioInput,
  months = 60,
): ScenarioStudioResult {
  const scenarios = simulateAllScenarios(input, months);
  const best = scenarios.reduce((a, b) =>
    b.netPositionAt60 > a.netPositionAt60 ? b : a,
  );
  const worst = scenarios.reduce((a, b) =>
    b.netPositionAt60 < a.netPositionAt60 ? b : a,
  );
  const spreadAt60 = best.netPositionAt60 - worst.netPositionAt60;

  let readinessNote =
    "Pair this model with Path to Ready — a better net position does not clear protective hard-stops.";
  if (input.readinessVerdict === "NOT_YET") {
    readinessNote =
      "Your readiness verdict is DO NOT PROCEED. Even if wait/buy math favors a scenario, " +
      "clear hard-stops before treating any path as actionable.";
  } else if (input.readinessVerdict === "BUILD_FIRST") {
    readinessNote =
      "BUILD FIRST: use the wait scenarios as time to fund runway and alignment — not as permission to stretch.";
  } else if (input.readinessVerdict === "READY") {
    readinessNote =
      "READY band on last assessment — still re-check Path to Ready if inputs moved.";
  }

  return {
    scenarios,
    bestKey: best.key,
    bestLabel: best.label,
    spreadAt60,
    readinessNote,
    disclaimer: SCENARIO_DISCLAIMER,
  };
}

export function scenarioInputsFromFinance(opts: {
  liquidSavings?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  monthlyDebtPayments?: number;
  downPaymentTarget?: number;
}): SimulationInputs {
  const surplus =
    opts.monthlyIncome != null && opts.monthlyExpenses != null
      ? Math.max(
          0,
          opts.monthlyIncome -
            opts.monthlyExpenses -
            (opts.monthlyDebtPayments ?? 0),
        )
      : DEFAULT_SIMULATION_INPUTS.monthlySavings;

  return {
    ...DEFAULT_SIMULATION_INPUTS,
    downPaymentSaved:
      opts.liquidSavings ?? DEFAULT_SIMULATION_INPUTS.downPaymentSaved,
    monthlySavings: surplus || DEFAULT_SIMULATION_INPUTS.monthlySavings,
    homePrice: Math.max(
      DEFAULT_SIMULATION_INPUTS.homePrice,
      (opts.downPaymentTarget ?? 60_000) * 5,
    ),
  };
}
