import { describe, expect, it } from "vitest";
import { DEFAULT_SIMULATION_INPUTS } from "@/lib/decisions/simulate";
import { generatePathFromScenario } from "@/lib/readiness";

describe("generatePathFromScenario", () => {
  it("builds a wait-12 funding path with down-payment gap step", () => {
    const path = generatePathFromScenario({
      inputs: {
        ...DEFAULT_SIMULATION_INPUTS,
        homePrice: 400000,
        downPaymentSaved: 20000,
        monthlySavings: 1500,
      },
      scenarioKey: "wait-12",
    });
    expect(path.mode).toBe("build");
    expect(path.steps.length).toBeGreaterThan(1);
    expect(
      path.steps.some((s) => /wait|down payment|fund/i.test(s.title)),
    ).toBe(true);
    expect(path.steps.some((s) => s.fundingTarget != null && s.fundingTarget > 0)).toBe(
      true,
    );
  });

  it("buy-now path points at preflight", () => {
    const path = generatePathFromScenario({
      inputs: DEFAULT_SIMULATION_INPUTS,
      scenarioKey: "buy-now",
    });
    expect(path.steps.some((s) => s.href === "/tools/preflight")).toBe(true);
  });
});
