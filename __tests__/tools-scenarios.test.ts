// @vitest-environment jsdom
/**
 * Scenario contract: snapshots anchor honestly, drift is named (never
 * silently refreshed), evaluation reuses the dashboard's own math, and
 * the anonymous local store honors its cap by replacement — never by
 * silently dropping the new save.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  scenarioDrift,
  scenarioMonthlyObligation,
  evaluateScenario,
  compareScenarios,
  saveLocalScenario,
  loadLocalScenarios,
  deleteLocalScenario,
  LOCAL_SCENARIO_CAP,
  type ToolScenario,
} from "@/lib/tools/scenarios";
import { deriveCfm } from "@/lib/tools/cfm";
import { DEFAULT_FINANCE_STATE } from "@/lib/finance/store";

const SNAPSHOT = {
  monthlyIncome: 6000,
  monthlyExpenses: 3000,
  monthlyDebtPayments: 500,
  liquidSavings: 21000,
  totalDebt: 15000,
};

function scenario(overrides: Partial<ToolScenario> = {}): ToolScenario {
  return {
    id: "s1",
    name: "House at $420k",
    lensId: "mortgage",
    inputs: { price: 420000, downPayment: 84000, rate: 6.5, termYears: 30, taxInsRate: 1.5, hoaMonthly: 0 },
    cfmSnapshot: SNAPSHOT,
    savedAt: new Date().toISOString(),
    origin: "server",
    ...overrides,
  };
}

describe("scenarioDrift", () => {
  it("names exactly what changed", () => {
    const cfm = deriveCfm({ ...DEFAULT_FINANCE_STATE, monthlyIncome: 7200 }, {}, null);
    const drift = scenarioDrift(scenario(), cfm);
    expect(drift).toHaveLength(1);
    expect(drift[0]).toMatchObject({ field: "monthlyIncome", from: 6000, to: 7200 });
  });

  it("is empty when nothing changed, and never stale without a snapshot", () => {
    const cfm = deriveCfm({ ...DEFAULT_FINANCE_STATE, ...SNAPSHOT }, {}, null);
    expect(scenarioDrift(scenario(), cfm)).toEqual([]);
    expect(scenarioDrift(scenario({ cfmSnapshot: null }), cfm)).toEqual([]);
    expect(scenarioDrift(scenario(), null)).toEqual([]);
  });
});

describe("evaluateScenario", () => {
  it("computes the obligation and deltas with the dashboard's own math", () => {
    const evaluation = evaluateScenario(scenario());
    expect(evaluation.monthlyCost).not.toBeNull();
    // 336k loan at 6.5%/30yr ≈ $2,126 P&I + taxes/ins ≈ $2,650 total.
    expect(evaluation.monthlyCost!).toBeGreaterThan(2500);
    expect(evaluation.monthlyCost!).toBeLessThan(2800);
    // Runway after: 21000 / (3000 + 500 + total) — sanity bounds.
    expect(evaluation.runwayAfter!).toBeGreaterThan(2);
    expect(evaluation.runwayAfter!).toBeLessThan(5);
    // DTI after: (500 + total) / 6000 ≈ 50%+.
    expect(evaluation.dtiAfter!).toBeGreaterThan(40);
  });

  it("returns nulls honestly when the lens has no monthly obligation", () => {
    const runway = scenario({ lensId: "runway", inputs: { expenses: 3200, savings: 9600 } });
    expect(scenarioMonthlyObligation(runway)).toBeNull();
    expect(evaluateScenario(runway).runwayAfter).toBeNull();
  });
});

describe("compareScenarios", () => {
  it("picks the honest winner per row", () => {
    const cheaper = scenario({
      id: "cheap",
      name: "House at $360k",
      inputs: { price: 360000, downPayment: 84000, rate: 6.5, termYears: 30, taxInsRate: 1.5 },
    });
    const rows = compareScenarios(cheaper, scenario());
    const cost = rows.find((r) => r.key === "monthlyCost")!;
    expect(cost.better).toBe("a"); // cheaper house wins the cost row
    const runway = rows.find((r) => r.key === "runwayAfter")!;
    expect(runway.better).toBe("a"); // and leaves more runway
    const dti = rows.find((r) => r.key === "dtiAfter")!;
    expect(dti.better).toBe("a");
  });

  it("calls a tie a tie", () => {
    const rows = compareScenarios(scenario(), scenario({ id: "s2" }));
    expect(rows.every((r) => r.better === null)).toBe(true);
  });
});

describe("local scenario store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips and deletes", () => {
    const { scenario: saved } = saveLocalScenario({
      name: "Test",
      lensId: "mortgage",
      inputs: { price: 1 },
      cfmSnapshot: null,
    });
    expect(loadLocalScenarios()).toHaveLength(1);
    expect(loadLocalScenarios()[0].origin).toBe("local");
    deleteLocalScenario(saved.id);
    expect(loadLocalScenarios()).toEqual([]);
  });

  it("honors the anonymous cap by replacing the oldest, keeping the new", () => {
    saveLocalScenario({ name: "First", lensId: "mortgage", inputs: {}, cfmSnapshot: null });
    const { replaced } = saveLocalScenario({
      name: "Second",
      lensId: "mortgage",
      inputs: {},
      cfmSnapshot: null,
    });
    const all = loadLocalScenarios();
    expect(all).toHaveLength(LOCAL_SCENARIO_CAP);
    expect(all[0].name).toBe("Second");
    expect(replaced?.name).toBe("First");
  });
});
