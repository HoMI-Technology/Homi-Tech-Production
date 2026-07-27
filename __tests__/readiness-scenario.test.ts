import { describe, expect, it } from "vitest";
import { runScenarioStudio, scenarioInputsFromFinance } from "@/lib/readiness";
import { DEFAULT_SIMULATION_INPUTS } from "@/lib/decisions/simulate";

describe("runScenarioStudio", () => {
  it("returns three scenarios and a best key", () => {
    const studio = runScenarioStudio({
      ...DEFAULT_SIMULATION_INPUTS,
      readinessVerdict: "BUILD_FIRST",
      readinessScore: 58,
    });
    expect(studio.scenarios).toHaveLength(3);
    expect(studio.bestKey).toBeTruthy();
    expect(studio.readinessNote).toMatch(/BUILD FIRST/i);
    expect(studio.disclaimer).toMatch(/Educational/i);
  });

  it("scenarioInputsFromFinance maps surplus to monthly savings", () => {
    const inputs = scenarioInputsFromFinance({
      liquidSavings: 20000,
      monthlyIncome: 8000,
      monthlyExpenses: 5000,
      monthlyDebtPayments: 500,
    });
    expect(inputs.monthlySavings).toBe(2500);
    expect(inputs.downPaymentSaved).toBe(20000);
  });
});
