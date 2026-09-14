import { describe, expect, it } from "vitest";
import { generatePath, addDaysDateOnly } from "@/lib/path/generator";
import {
  HARD_STOP_RESOLUTION_ORDER,
  resolveBindingConstraint,
  weakestPillar,
} from "@/lib/path/constraints";
import { CONFIDENCE_CAPS, confidenceCapFor } from "@/lib/path/confidence";
import type {
  GeneratePathInput,
  PathHardStopCode,
  PathMetricsInput,
  PathPillarSnapshot,
  RecordedHardStop,
} from "@/lib/path/types";

const PILLARS: PathPillarSnapshot = {
  financial: { total: 20, max: 35 },
  emotional: { total: 25, max: 35 },
  timing: { total: 18, max: 30 },
};

const METRICS: PathMetricsInput = {
  asOf: "2026-09-01",
  completeness: "medium",
  monthsWithData: 2,
  monthlyIncomeCents: 500_000,
  monthlyOutflowCents: 400_000,
  monthlyDebtPaymentsCents: 300_000, // DTI 60% → over the 50 line
  liquidSavingsCents: 100_000,
  runwayMonths: 0.3,
  dtiPct: 60,
  surplusCents: -100_000,
};

function stops(...codes: PathHardStopCode[]): RecordedHardStop[] {
  return codes.map((code) => ({ code, message: `recorded:${code}` }));
}

function baseInput(overrides: Partial<GeneratePathInput> = {}): GeneratePathInput {
  return {
    verdict: "NOT_YET",
    hardStops: stops("DTI_OVER_50"),
    pillars: PILLARS,
    metrics: METRICS,
    goals: [],
    asOfDate: "2026-09-14",
    assessmentId: "a-1",
    ...overrides,
  };
}

describe("binding-constraint ordering", () => {
  it("resolves hard stops in the canon order runway → DTI → housing → credit (matches lib/readiness/path.ts)", () => {
    expect(HARD_STOP_RESOLUTION_ORDER).toEqual([
      "RUNWAY_UNDER_1_MONTH",
      "DTI_OVER_50",
      "HOUSING_RATIO_OVER_45",
      "CREDIT_UNDER_620",
    ]);
  });

  // Every non-empty subset of the four hard stops.
  const ALL: PathHardStopCode[] = [
    "RUNWAY_UNDER_1_MONTH",
    "DTI_OVER_50",
    "HOUSING_RATIO_OVER_45",
    "CREDIT_UNDER_620",
  ];
  const subsets: PathHardStopCode[][] = [];
  for (let mask = 1; mask < 16; mask++) {
    subsets.push(ALL.filter((_, i) => mask & (1 << i)));
  }

  for (const combo of subsets) {
    it(`combination [${combo.join(",")}] resolves binding + chain in order`, () => {
      const path = generatePath(baseInput({ hardStops: stops(...combo) }));
      const expectedOrder = HARD_STOP_RESOLUTION_ORDER.filter((c) => combo.includes(c));
      expect(path.bindingConstraint.code).toBe(expectedOrder[0]);
      const hsMilestones = path.milestones.filter((m) => m.kind === "hard_stop");
      expect(hsMilestones).toHaveLength(combo.length);
      // Chain integrity within the hard-stop run: first depends on nothing,
      // each subsequent depends on the previous milestone id.
      expect(hsMilestones[0].dependsOn).toBeNull();
      for (let i = 1; i < hsMilestones.length; i++) {
        expect(hsMilestones[i].dependsOn).toBe(hsMilestones[i - 1].id);
      }
    });
  }

  it("falls back to the weakest pillar when no hard stop fired", () => {
    const bc = resolveBindingConstraint([], PILLARS);
    // financial = 20/35 ≈ 0.571, timing = 18/30 = 0.6, emotional = 25/35 ≈ 0.714
    expect(weakestPillar(PILLARS)).toBe("financial");
    expect(bc.code).toBe("pillar:financial");
  });

  it("rationale is neutral and protective", () => {
    const bc = resolveBindingConstraint(stops("RUNWAY_UNDER_1_MONTH"), PILLARS);
    expect(bc.rationale).toContain("constraint to resolve first");
    expect(bc.rationale).not.toMatch(/should|urgent|act now|hurry/i);
  });
});

describe("deterministic generation", () => {
  it("same input → byte-identical output (ids, dates, amounts, order)", () => {
    const input = baseInput({
      hardStops: stops("DTI_OVER_50", "RUNWAY_UNDER_1_MONTH", "CREDIT_UNDER_620"),
      goals: [
        {
          id: "g1",
          name: "House fund",
          goalType: "home",
          targetAmountCents: 5_000_000,
          currentAmountCents: 1_000_000,
          targetDate: "2027-06-01",
        },
      ],
    });
    const a = generatePath(input);
    const b = generatePath(input);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("derives dates deterministically from asOfDate", () => {
    expect(addDaysDateOnly("2026-09-14", 30)).toBe("2026-10-14");
    expect(addDaysDateOnly("2026-12-20", 30)).toBe("2027-01-19");
    const path = generatePath(baseInput({ hardStops: stops("DTI_OVER_50") }));
    expect(path.milestones[0].targetDate).toBe("2026-10-14");
  });

  it("DTI target = recorded debt payments − 50% of recorded income", () => {
    const path = generatePath(baseInput({ hardStops: stops("DTI_OVER_50") }));
    const m = path.milestones[0];
    expect(m.targetAmountCents).toBe(300_000 - 250_000);
    expect(m.fundingSource.metric).toBe("dti");
    expect(m.fundingSource.basis).toBe("metric");
  });

  it("runway target = one month of recorded outflow − recorded liquid savings", () => {
    const path = generatePath(baseInput({ hardStops: stops("RUNWAY_UNDER_1_MONTH") }));
    const m = path.milestones[0];
    expect(m.targetAmountCents).toBe(400_000 - 100_000);
    expect(m.fundingSource.metric).toBe("runway");
  });
});

describe("null amounts on missing data", () => {
  it("withholds the DTI amount when income is missing", () => {
    const path = generatePath(
      baseInput({ metrics: { ...METRICS, monthlyIncomeCents: null } }),
    );
    const m = path.milestones[0];
    expect(m.targetAmountCents).toBeNull();
    expect(m.fundingSource.basis).toBe("insufficient_data");
  });

  it("withholds the runway amount when liquid savings are unknown", () => {
    const path = generatePath(
      baseInput({
        hardStops: stops("RUNWAY_UNDER_1_MONTH"),
        metrics: { ...METRICS, liquidSavingsCents: null },
      }),
    );
    expect(path.milestones[0].targetAmountCents).toBeNull();
    expect(path.milestones[0].fundingSource.basis).toBe("insufficient_data");
  });

  it("housing and credit hard stops never carry invented amounts", () => {
    const path = generatePath(
      baseInput({ hardStops: stops("HOUSING_RATIO_OVER_45", "CREDIT_UNDER_620") }),
    );
    for (const m of path.milestones.filter((x) => x.kind === "hard_stop")) {
      expect(m.targetAmountCents).toBeNull();
    }
  });

  it("generates a usable path with NO metrics at all (questionnaire-only, A5)", () => {
    const path = generatePath(baseInput({ metrics: null }));
    expect(path.milestones.length).toBeGreaterThan(0);
    const hs = path.milestones.find((m) => m.kind === "hard_stop");
    expect(hs?.targetAmountCents).toBeNull();
    // Evidence milestone appears when metrics are absent entirely.
    expect(path.milestones.some((m) => m.kind === "evidence")).toBe(true);
  });
});

describe("confidence caps", () => {
  it("low completeness caps every metric-backed milestone at 0.35", () => {
    const path = generatePath(
      baseInput({
        hardStops: stops("DTI_OVER_50", "RUNWAY_UNDER_1_MONTH"),
        metrics: { ...METRICS, completeness: "low" },
        goals: [
          {
            id: "g1",
            name: "Reserve",
            goalType: "emergency_reserve",
            targetAmountCents: 500_000,
            currentAmountCents: 0,
            targetDate: null,
          },
        ],
      }),
    );
    for (const m of path.milestones) {
      expect(m.fundingSource.confidenceCap).toBeLessThanOrEqual(CONFIDENCE_CAPS.low);
    }
  });

  it("cap ladder: low < medium < high < 1", () => {
    expect(CONFIDENCE_CAPS.low).toBeLessThan(CONFIDENCE_CAPS.medium);
    expect(CONFIDENCE_CAPS.medium).toBeLessThan(CONFIDENCE_CAPS.high);
    expect(CONFIDENCE_CAPS.high).toBeLessThan(1);
    expect(confidenceCapFor(null)).toBe(CONFIDENCE_CAPS.low);
  });

  it("high completeness allows the high cap on metric-backed targets", () => {
    const path = generatePath(
      baseInput({ metrics: { ...METRICS, completeness: "high" } }),
    );
    const m = path.milestones[0];
    expect(m.fundingSource.confidenceCap).toBe(CONFIDENCE_CAPS.high);
  });
});

describe("depends_on chain integrity", () => {
  it("no cycles; dependencies always point backwards in sort order", () => {
    const combos: RecordedHardStop[][] = [
      stops("DTI_OVER_50"),
      stops("DTI_OVER_50", "HOUSING_RATIO_OVER_45", "RUNWAY_UNDER_1_MONTH", "CREDIT_UNDER_620"),
      [],
    ];
    for (const hardStops of combos) {
      const path = generatePath(
        baseInput({
          hardStops,
          verdict: hardStops.length ? "NOT_YET" : "BUILD_FIRST",
          goals: [
            {
              id: "g1",
              name: "A",
              goalType: "home",
              targetAmountCents: 100,
              currentAmountCents: 0,
              targetDate: null,
            },
            {
              id: "g2",
              name: "B",
              goalType: "custom",
              targetAmountCents: 200,
              currentAmountCents: 50,
              targetDate: null,
            },
          ],
        }),
      );
      const orderByid = new Map(path.milestones.map((m) => [m.id, m.sortOrder]));
      for (const m of path.milestones) {
        if (m.dependsOn === null) continue;
        const depOrder = orderByid.get(m.dependsOn);
        expect(depOrder).toBeDefined();
        expect(depOrder!).toBeLessThan(m.sortOrder);
      }
      // Explicit cycle check via walk.
      for (const m of path.milestones) {
        const seen = new Set<string>();
        let cur = m.dependsOn;
        while (cur !== null) {
          expect(seen.has(cur)).toBe(false);
          seen.add(cur);
          cur = path.milestones.find((x) => x.id === cur)?.dependsOn ?? null;
        }
      }
    }
  });

  it("binding constraint milestone is first and depends on nothing", () => {
    const path = generatePath(
      baseInput({ hardStops: stops("RUNWAY_UNDER_1_MONTH", "DTI_OVER_50") }),
    );
    const first = [...path.milestones].sort((a, b) => a.sortOrder - b.sortOrder)[0];
    expect(first.dependsOn).toBeNull();
    // Canon order (lib/readiness/path.ts): RUNWAY resolves before DTI.
    expect(first.title).toBe("Stabilize emergency runway to at least 1 month");
  });
});

describe("verdict is never recomputed", () => {
  it("output contains no score fields and copies the verdict verbatim", () => {
    const path = generatePath(
      baseInput({
        verdict: "BUILD_FIRST",
        hardStops: [],
        goals: [
          {
            id: "g1",
            name: "House fund",
            goalType: "home",
            targetAmountCents: 5_000_000,
            currentAmountCents: 1_000_000,
            targetDate: "2027-01-01",
          },
        ],
      }),
    );
    expect(path.diagnosis.verdict).toBe("BUILD_FIRST");
    const json = JSON.stringify(path);
    expect(json).not.toContain('"score"');
    expect(json).not.toContain('"overall_score"');
    // No hard-stop re-detection: input had none, output milestones have none.
    expect(path.milestones.some((m) => m.kind === "hard_stop")).toBe(false);
  });

  it("READY produces one optional review, never homework", () => {
    const path = generatePath(baseInput({ verdict: "READY", hardStops: [] }));
    expect(path.milestones).toHaveLength(1);
    expect(path.milestones[0].kind).toBe("timing");
    expect(path.milestones[0].targetAmountCents).toBeNull();
    expect(path.milestones[0].title).toMatch(/optional/i);
  });
});

describe("neutral wording", () => {
  const BANNED =
    /you should|we recommend|recommended|act now|hurry|don't wait|limited time|before it's too late|FOMO/i;

  it("all milestone copy + constraint labels stay neutral", () => {
    const inputs: GeneratePathInput[] = [
      baseInput({
        hardStops: stops(
          "DTI_OVER_50",
          "HOUSING_RATIO_OVER_45",
          "RUNWAY_UNDER_1_MONTH",
          "CREDIT_UNDER_620",
        ),
      }),
      baseInput({ verdict: "BUILD_FIRST", hardStops: [] }),
      baseInput({ verdict: "READY", hardStops: [] }),
      baseInput({ metrics: null }),
    ];
    for (const input of inputs) {
      const path = generatePath(input);
      expect(path.bindingConstraint.label).not.toMatch(BANNED);
      expect(path.bindingConstraint.rationale).not.toMatch(BANNED);
      for (const m of path.milestones) {
        expect(m.title).not.toMatch(BANNED);
        expect(m.description).not.toMatch(BANNED);
      }
    }
  });
});

describe("evidence milestones", () => {
  it("appears when completeness is not high, absent when high", () => {
    const low = generatePath(baseInput({ metrics: { ...METRICS, completeness: "low" } }));
    expect(low.milestones.some((m) => m.kind === "evidence")).toBe(true);
    const high = generatePath(baseInput({ metrics: { ...METRICS, completeness: "high" } }));
    expect(high.milestones.some((m) => m.kind === "evidence")).toBe(false);
  });
});
