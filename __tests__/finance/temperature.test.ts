/**
 * Canon gauge lines. These four functions decide what colour a user's DTI,
 * savings rate, runway and cash flow turn, so the boundaries are pinned
 * exactly — including which side of each threshold is inclusive.
 *
 * The identity block at the bottom is the anti-drift guarantee: lib/finance/store.ts
 * and lib/planner/derived.ts used to carry byte-identical copies of these. They
 * now re-export the single implementation, and these assertions fail if anyone
 * reintroduces a local copy in either module.
 */

import { describe, expect, it } from "vitest";
import {
  dtiTemperature,
  savingsRateTemperature,
  runwayTemperature,
  cashFlowTemperature,
} from "@/lib/finance/temperature";
import * as store from "@/lib/finance/store";
import * as derived from "@/lib/planner/derived";

describe("dtiTemperature", () => {
  it("holds the canon boundaries, inclusive on the good side", () => {
    expect(dtiTemperature(0)).toBe("emerald");
    expect(dtiTemperature(28)).toBe("emerald");
    expect(dtiTemperature(28.01)).toBe("yellow");
    expect(dtiTemperature(36)).toBe("yellow");
    expect(dtiTemperature(36.01)).toBe("amber");
    expect(dtiTemperature(43)).toBe("amber");
    expect(dtiTemperature(43.01)).toBe("crimson");
  });

  it("takes percent scale, not a ratio — 0.3 is a 0.3% DTI, not 30%", () => {
    expect(dtiTemperature(0.3)).toBe("emerald");
  });
});

describe("savingsRateTemperature", () => {
  it("holds the canon boundaries, higher is better", () => {
    expect(savingsRateTemperature(20)).toBe("emerald");
    expect(savingsRateTemperature(19.99)).toBe("yellow");
    expect(savingsRateTemperature(10)).toBe("yellow");
    expect(savingsRateTemperature(9.99)).toBe("amber");
    expect(savingsRateTemperature(0)).toBe("amber");
    expect(savingsRateTemperature(-0.01)).toBe("crimson");
  });
});

describe("runwayTemperature", () => {
  it("holds the canon boundaries in months", () => {
    expect(runwayTemperature(6)).toBe("emerald");
    expect(runwayTemperature(5.99)).toBe("yellow");
    expect(runwayTemperature(3)).toBe("yellow");
    expect(runwayTemperature(2.99)).toBe("amber");
    expect(runwayTemperature(1)).toBe("amber");
    expect(runwayTemperature(0.99)).toBe("crimson");
    expect(runwayTemperature(0)).toBe("crimson");
  });

  it("reads a non-finite runway as emerald — infinite runway is the good case", () => {
    expect(runwayTemperature(Number.POSITIVE_INFINITY)).toBe("emerald");
    expect(runwayTemperature(Number.NaN)).toBe("emerald");
  });
});

describe("cashFlowTemperature", () => {
  it("bands on the flow-to-income ratio", () => {
    expect(cashFlowTemperature(150, 1000)).toBe("emerald");
    expect(cashFlowTemperature(149, 1000)).toBe("yellow");
    expect(cashFlowTemperature(50, 1000)).toBe("yellow");
    expect(cashFlowTemperature(49, 1000)).toBe("amber");
    expect(cashFlowTemperature(0, 1000)).toBe("amber");
    expect(cashFlowTemperature(-1, 1000)).toBe("crimson");
  });

  it("returns amber rather than dividing by zero when income is absent", () => {
    expect(cashFlowTemperature(500, 0)).toBe("amber");
    expect(cashFlowTemperature(-500, -100)).toBe("amber");
  });
});

describe("single source of truth", () => {
  it("store.ts re-exports the same functions, not copies", () => {
    expect(store.dtiTemperature).toBe(dtiTemperature);
    expect(store.savingsRateTemperature).toBe(savingsRateTemperature);
    expect(store.runwayTemperature).toBe(runwayTemperature);
    expect(store.cashFlowTemperature).toBe(cashFlowTemperature);
  });

  it("planner/derived.ts re-exports the same functions, not copies", () => {
    expect(derived.dtiTemperature).toBe(dtiTemperature);
    expect(derived.savingsRateTemperature).toBe(savingsRateTemperature);
    expect(derived.runwayTemperature).toBe(runwayTemperature);
    expect(derived.cashFlowTemperature).toBe(cashFlowTemperature);
  });
});
