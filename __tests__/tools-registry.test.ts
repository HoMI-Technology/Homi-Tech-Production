/**
 * Registry contract: ids and paths are unique, chain targets always
 * resolve to real lenses (no dead hand-offs), input CFM paths use valid
 * prefixes, fallbacks stay in bounds, and CFM seed resolution honors
 * the honesty rules (missing data never seeds a slider).
 */

import { describe, expect, it } from "vitest";
import {
  LENSES,
  RING_ORDER,
  getLens,
  hubLenses,
  hubLensesByRing,
  lensCoveragePaths,
  resolveCarryWrites,
  resolveLensSeeds,
} from "@/lib/tools/registry";
import { deriveCfm } from "@/lib/tools/cfm";
import { DEFAULT_FINANCE_STATE } from "@/lib/finance/store";

const VALID_CFM_PREFIXES = ["core.", "housing.", "horizon."];

describe("lens registry", () => {
  it("has unique ids and paths", () => {
    const ids = LENSES.map((l) => l.id);
    const paths = LENSES.map((l) => l.path);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("every lens sits on a known ring and declares a placement", () => {
    const placements = ["hub", "more", "deep-link", "hidden", "redirect"] as const;
    for (const lens of LENSES) {
      expect(RING_ORDER).toContain(lens.ring);
      expect(placements).toContain(lens.placement);
    }
  });

  it("public hub lists exactly the ten locked lenses", () => {
    const hub = hubLenses();
    expect(hub).toHaveLength(10);
    expect(hub.map((l) => l.id).sort()).toEqual(
      [
        "affordability",
        "apr-compare",
        "blind-budget",
        "debt-payoff",
        "fire",
        "heloc",
        "loan-programs",
        "monte-carlo",
        "refinance",
        "roth-conversion",
      ].sort(),
    );
    expect(hub.some((l) => l.id === "simulator")).toBe(false);
    expect(hub.some((l) => l.id === "mortgage")).toBe(false);
    expect(hub.some((l) => l.id === "down-payment")).toBe(false);
    expect(hub.some((l) => l.id === "runway")).toBe(false);
    expect(hub.some((l) => l.id === "rent-vs-buy")).toBe(false);
    expect(hub.some((l) => l.id === "path-to-ready")).toBe(false);
    expect(hub.some((l) => l.id === "scenario-studio")).toBe(false);
    expect(hub.some((l) => l.id === "preflight")).toBe(false);
  });

  it("off-hub extras keep their routes and placements", () => {
    expect(getLens("mortgage")).toMatchObject({
      path: "/tools/mortgage",
      placement: "redirect",
    });
    expect(getLens("rent-vs-buy")).toMatchObject({
      path: "/tools/rent-vs-buy",
      placement: "deep-link",
    });
    expect(getLens("down-payment")).toMatchObject({
      path: "/tools/down-payment",
      placement: "deep-link",
    });
    expect(getLens("runway")).toMatchObject({ path: "/tools/runway", placement: "deep-link" });
    expect(getLens("path-to-ready")).toMatchObject({ path: "/path", placement: "more" });
    expect(getLens("scenario-studio")).toMatchObject({ path: "/scenarios", placement: "more" });
    expect(getLens("simulator")).toMatchObject({ path: "/simulator", placement: "hidden" });
    expect(getLens("preflight")).toMatchObject({ path: "/tools/preflight", placement: "more" });
  });

  it("hub and registry marketing copy drops 18-calculators and Monte Carlo run counts", () => {
    const hubCopy = hubLenses()
      .map((l) => `${l.name} ${l.desc}`)
      .join("\n");
    const chainPitches = LENSES.flatMap((l) => (l.chains ?? []).map((c) => c.pitch)).join("\n");
    expect(hubCopy).not.toMatch(/18 calculators/i);
    expect(hubCopy).not.toMatch(/\b1,000\b/);
    expect(hubCopy).not.toMatch(/\b10,000\b/);
    expect(chainPitches).not.toMatch(/\b1,000\b/);
    expect(chainPitches).not.toMatch(/\b10,000\b/);
    expect(getLens("monte-carlo")!.desc).toMatch(/simulated paths/i);
    expect(getLens("roth-conversion")!.desc).toMatch(/not a recommendation/i);
  });

  it("hubLensesByRing never surfaces off-hub cards", () => {
    for (const ring of RING_ORDER) {
      for (const lens of hubLensesByRing(ring)) {
        expect(lens.placement).toBe("hub");
        expect(lens.ring).toBe(ring);
      }
    }
  });

  it("chain targets always resolve — no dead hand-offs", () => {
    for (const lens of LENSES) {
      for (const chain of lens.chains ?? []) {
        expect(getLens(chain.lensId), `${lens.id} chains to missing ${chain.lensId}`).toBeDefined();
        expect(chain.lensId).not.toBe(lens.id);
      }
    }
  });

  it("input CFM paths use valid prefixes and have fallbacks", () => {
    for (const lens of LENSES) {
      for (const input of lens.inputs ?? []) {
        if (input.cfmPath) {
          expect(
            VALID_CFM_PREFIXES.some((p) => input.cfmPath!.startsWith(p)),
            `${lens.id}.${input.key} has invalid cfmPath ${input.cfmPath}`,
          ).toBe(true);
        }
        expect(Number.isFinite(input.fallback)).toBe(true);
        expect(input.min).toBeLessThan(input.max);
        expect(input.fallback).toBeGreaterThanOrEqual(input.min);
        expect(input.fallback).toBeLessThanOrEqual(input.max);
      }
    }
  });

  it("lensCoveragePaths collects only declared cfmPaths", () => {
    const mortgage = getLens("mortgage")!;
    const paths = lensCoveragePaths(mortgage);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths).toContain("housing.targetPrice");
    // The simulator declares no inputs yet — coverage is empty, not broken.
    expect(lensCoveragePaths(getLens("simulator")!)).toEqual([]);
  });
});

describe("resolveLensSeeds", () => {
  it("seeds from real CFM values, clamped to slider bounds", () => {
    const cfm = deriveCfm(
      { ...DEFAULT_FINANCE_STATE, monthlyIncome: 8000, liquidSavings: 50000 },
      { targetPrice: 99999999 }, // beyond slider max — must clamp
      null,
    );
    const mortgageSeeds = resolveLensSeeds(getLens("mortgage")!, cfm);
    expect(mortgageSeeds.price).toBe(1500000); // clamped to max

    const runwaySeeds = resolveLensSeeds(getLens("runway")!, cfm);
    expect(runwaySeeds.savings).toBe(50000);
    // expenses derives from outflow = expenses + debt payments.
    expect(runwaySeeds.expenses).toBe(
      DEFAULT_FINANCE_STATE.monthlyExpenses + DEFAULT_FINANCE_STATE.monthlyDebtPayments,
    );
  });

  it("derives computed seeds (annual income, loan from overlay)", () => {
    const cfm = deriveCfm(
      { ...DEFAULT_FINANCE_STATE, monthlyIncome: 8000 },
      { targetPrice: 420000, downPaymentSaved: 84000 },
      null,
    );
    const affordability = resolveLensSeeds(getLens("affordability")!, cfm);
    expect(affordability.income).toBe(96000);
    expect(affordability.downPayment).toBe(84000);

    const apr = resolveLensSeeds(getLens("apr-compare")!, cfm);
    expect(apr.loan).toBe(336000); // 420000 - 84000
  });

  it("never seeds from missing data — fallbacks stay illustrative", () => {
    const cfm = deriveCfm(DEFAULT_FINANCE_STATE, {}, null); // no overlay
    const seeds = resolveLensSeeds(getLens("heloc")!, cfm);
    expect(seeds.homeValue).toBeUndefined();
    expect(seeds.mortgageBalance).toBeUndefined();
  });

  it("blind-budget ranges center on saved numbers", () => {
    const cfm = deriveCfm(
      { ...DEFAULT_FINANCE_STATE, monthlyIncome: 10000, liquidSavings: 20000 },
      {},
      null,
    );
    const seeds = resolveLensSeeds(getLens("blind-budget")!, cfm);
    expect(seeds.incomeLow).toBe(8500);
    expect(seeds.incomeHigh).toBe(11500);
    expect(seeds.savingsLow).toBe(17000);
  });
});

describe("resolveCarryWrites", () => {
  it("maps carried values to the target lens's write-back fields", () => {
    const rentVsBuy = getLens("rent-vs-buy")!;
    const chain = { lensId: "rent-vs-buy", pitch: "Compare", carry: ["price", "rate"] };
    const written = resolveCarryWrites(
      chain,
      { price: 450000, rate: 6.5, termYears: 30, hoaMonthly: 150 },
      rentVsBuy,
    );
    expect(written).toEqual({
      targetPrice: 450000,
      assumedRatePct: 6.5,
    });
  });

  it("ignores carried keys the target lens does not have", () => {
    const downPayment = getLens("down-payment")!;
    const chain = { lensId: "down-payment", pitch: "Save", carry: ["price", "rate"] };
    const written = resolveCarryWrites(chain, { price: 400000, rate: 6.5 }, downPayment);
    expect(written).toEqual({ targetPrice: 400000 });
  });

  it("ignores undefined or non-finite carried values", () => {
    const mortgage = getLens("mortgage")!;
    const chain = { lensId: "mortgage", pitch: "Pay", carry: ["price", "rate"] };
    const written = resolveCarryWrites(chain, { price: NaN, rate: 6.5 }, mortgage);
    expect(written).toEqual({ assumedRatePct: 6.5 });
  });

  it("skips target inputs without a writeBack field", () => {
    const affordability = getLens("affordability")!;
    const chain = { lensId: "affordability", pitch: "Check", carry: ["income"] };
    const written = resolveCarryWrites(chain, { income: 120000 }, affordability);
    expect(written).toEqual({});
  });
});

describe("chain carry contract", () => {
  it("affordability no longer chains to the folded mortgage lens", () => {
    const chains = getLens("affordability")?.chains ?? [];
    expect(chains.some((c) => c.lensId === "mortgage")).toBe(false);
  });

  it("every non-empty carry key resolves to an input on the target lens", () => {
    const mismatches: string[] = [];
    for (const lens of LENSES) {
      for (const chain of lens.chains ?? []) {
        const target = getLens(chain.lensId);
        if (!target) continue;
        for (const key of chain.carry) {
          const input = target.inputs?.find((i) => i.key === key);
          if (!input) {
            mismatches.push(`${lens.id} -> ${chain.lensId} carries unknown key "${key}"`);
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});
