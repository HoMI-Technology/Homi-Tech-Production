// @vitest-environment jsdom
/**
 * Decision Rehearsal state persistence: inputs survive page navigation by
 * storing in localStorage, with safe fallback to defaults when storage is
 * empty or corrupted.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { loadDecisionInputs, saveDecisionInputs } from "@/lib/decisions/state";
import { DEFAULT_SIMULATION_INPUTS } from "@/lib/decisions/simulate";

beforeEach(() => {
  window.localStorage.clear();
});

describe("loadDecisionInputs", () => {
  it("returns defaults when nothing is saved", () => {
    expect(loadDecisionInputs()).toEqual(DEFAULT_SIMULATION_INPUTS);
  });

  it("merges saved numeric fields over defaults", () => {
    saveDecisionInputs({ ...DEFAULT_SIMULATION_INPUTS, homePrice: 600_000, rate: 7 });
    const loaded = loadDecisionInputs();
    expect(loaded.homePrice).toBe(600_000);
    expect(loaded.rate).toBe(7);
    expect(loaded.rent).toBe(DEFAULT_SIMULATION_INPUTS.rent);
  });

  it("ignores corrupted or non-numeric stored values", () => {
    window.localStorage.setItem(
      "homi:decision:inputs",
      JSON.stringify({ homePrice: "expensive", downPaymentSaved: 50_000, rent: null }),
    );
    const loaded = loadDecisionInputs();
    expect(loaded.homePrice).toBe(DEFAULT_SIMULATION_INPUTS.homePrice);
    expect(loaded.downPaymentSaved).toBe(50_000);
    expect(loaded.rent).toBe(DEFAULT_SIMULATION_INPUTS.rent);
  });

  it("falls back to defaults when storage contains invalid JSON", () => {
    window.localStorage.setItem("homi:decision:inputs", "not-json");
    expect(loadDecisionInputs()).toEqual(DEFAULT_SIMULATION_INPUTS);
  });
});

describe("saveDecisionInputs", () => {
  it("persists only the expected numeric fields", () => {
    const inputs = { ...DEFAULT_SIMULATION_INPUTS, homePrice: 550_000 };
    saveDecisionInputs(inputs);
    const raw = window.localStorage.getItem("homi:decision:inputs");
    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual({
      homePrice: 550_000,
      downPaymentSaved: inputs.downPaymentSaved,
      monthlySavings: inputs.monthlySavings,
      rent: inputs.rent,
      rate: inputs.rate,
      appreciation: inputs.appreciation,
      rentIncrease: inputs.rentIncrease,
    });
  });
});
