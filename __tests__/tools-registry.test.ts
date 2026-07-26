/**
 * Registry contract: ids and paths are unique, chain targets always
 * resolve to real lenses (no dead hand-offs), input CFM paths use valid
 * prefixes, and every lens sits on a known ring.
 */

import { describe, expect, it } from "vitest";
import { LENSES, RING_ORDER, getLens, lensCoveragePaths } from "@/lib/tools/registry";

const VALID_CFM_PREFIXES = ["core.", "housing.", "horizon."];

describe("lens registry", () => {
  it("has unique ids and paths", () => {
    const ids = LENSES.map((l) => l.id);
    const paths = LENSES.map((l) => l.path);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("every lens sits on a known ring", () => {
    for (const lens of LENSES) {
      expect(RING_ORDER).toContain(lens.ring);
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
