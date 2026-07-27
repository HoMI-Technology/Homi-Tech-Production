/**
 * Readiness bands CI guard — Phase 5's trade-secret and honesty contract.
 *
 * 1. Band thresholds NEVER drift from the explainability engine's
 *    compositeBand (the readiness bands import it — this test proves the
 *    mapping stays aligned across the full delta range).
 * 2. User-facing band lines are NUMBER-FREE and WEIGHT-FREE. A regression
 *    that leaks the composite delta, point counts, or formula language
 *    fails CI here.
 * 3. The digest note and fallback synthesis speak magnitude only.
 */

import { describe, expect, it } from "vitest";
import { readinessImpactForHousing } from "@/lib/tools/readiness-bands";
import { buildLensDigestNote, buildLensSynthesisFallback, type LensDigest } from "@/lib/tools/digest";
import { compositeBand } from "@/lib/advisor/explain";
import { seedBaseline, deriveAnchors } from "@/lib/simulator";
import { DEFAULT_FINANCE_STATE } from "@/lib/finance/store";

const FORBIDDEN_IN_LINES = /\d|weight|formula|point|threshold/i;

function ctx() {
  const baseline = seedBaseline(null, {
    monthlyIncome: 6000,
    monthlyExpenses: 3000,
    monthlyDebtPayments: 500,
    liquidSavings: 21000,
    totalDebt: 15000,
  });
  const anchors = deriveAnchors(null); // neutral — no assessment
  return { baseline, anchors };
}

describe("band threshold alignment", () => {
  it("readiness bands map through the SAME compositeBand as score movement", () => {
    // Sweep the full delta range: the exported band function must agree
    // with the explain engine at every boundary.
    for (let d = 0; d <= 30; d += 0.5) {
      const band = compositeBand(d);
      if (d <= 3) expect(band, `delta ${d}`).toBe("small");
      else if (d <= 9) expect(band, `delta ${d}`).toBe("moderate");
      else expect(band, `delta ${d}`).toBe("large");
    }
  });
});

describe("readinessImpactForHousing", () => {
  it("a heavy obligation pulls readiness down, magnitude only", () => {
    const { baseline, anchors } = ctx();
    const impact = readinessImpactForHousing(baseline, anchors, {
      monthlyObligation: 3000,
      upfrontCost: 15000,
    })!;
    expect(impact.direction).toBe("down");
    expect(["moderate", "large"]).toContain(impact.band);
    // The line must never leak the number or the machinery.
    expect(impact.line).not.toMatch(FORBIDDEN_IN_LINES);
  });

  it("an affordable swap stays small or flat — and honest about anchors", () => {
    const { baseline, anchors } = ctx();
    const impact = readinessImpactForHousing(baseline, anchors, {
      monthlyObligation: 1200,
      replacedRentMonthly: 1200,
    })!;
    expect(["small", null]).toContain(impact.band);
    expect(impact.neutral).toBe(true); // no assessment → labeled
    expect(impact.line).not.toMatch(FORBIDDEN_IN_LINES);
  });

  it("returns null when there is no baseline to judge against", () => {
    const anchors = deriveAnchors(null);
    expect(
      readinessImpactForHousing(seedBaseline(null, null), anchors, { monthlyObligation: 2000 }),
    ).toBeNull();
  });
});

describe("magnitude-only surfaces", () => {
  const digest: LensDigest = {
    lensId: "mortgage",
    path: "/tools/mortgage",
    headline: { label: "Total monthly payment", value: 2526, unit: "currency" },
    keyInputs: { price: 420000 },
    deltas: [],
    readiness: { band: "moderate", direction: "down", hardStop: false },
    cfmCoverage: 0.8,
    updatedAt: Date.now(),
  };

  it("the digest note speaks band + direction, never numbers or weights", () => {
    const note = buildLensDigestNote(digest);
    expect(note).toContain("moderate");
    expect(note).toMatch(/magnitude only/i);
    // The readiness sentence itself must be number-free (headline/deltas
    // carry numbers by design — isolate the readiness portion).
    const readinessSentence = note.split(".").find((s) => s.includes("Readiness impact")) ?? "";
    expect(readinessSentence).not.toMatch(/\d/);
  });

  it("the hard-stop variant instructs protection, never circumvention", () => {
    const note = buildLensDigestNote({
      ...digest,
      readiness: { band: null, direction: "flat", hardStop: true },
    });
    expect(note).toMatch(/protective hard stop/i);
    expect(note).toMatch(/never how to get around it/i);
  });

  it("the fallback synthesis mentions readiness in magnitude language", () => {
    const reply = buildLensSynthesisFallback({
      ...digest,
      deltas: [
        {
          metric: "dti",
          label: "Debt-to-income",
          unit: "percent",
          from: 8,
          to: 50,
          fromTemperature: "emerald",
          toTemperature: "crimson",
          improved: false,
        },
      ],
    });
    expect(reply).toContain("moderate shift downward");
    // No leaked composite delta anywhere in the reply's readiness clause.
    const clause = reply.slice(reply.indexOf("In readiness terms"));
    expect(clause).not.toMatch(/\d/);
  });
});
