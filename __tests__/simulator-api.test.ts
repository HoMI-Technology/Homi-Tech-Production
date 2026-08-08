/**
 * Plans.md 6.4 — POST /api/simulator batch scores without shipping the engine
 * to the client. Parity: batch outcomes match lib/simulator pure helpers.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deriveAnchors,
  rankLevers,
  seedBaseline,
  simulate,
  type SimulatorBaseline,
} from "@/lib/simulator";
import { readinessImpactForHousing } from "@/lib/tools/readiness-bands";
import { runPreflight } from "@/lib/readiness/preflight";

vi.mock("@/lib/ratelimit", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 59 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

const BASELINE: SimulatorBaseline = {
  monthlyIncome: 6000,
  monthlyExpenses: 4000,
  liquidSavings: 10000,
  totalDebt: 30000,
  monthlyDebtPayments: null,
  source: "manual",
};

const ANCHOR = {
  emotional_score: 20,
  timing_score: 15,
  inputs: {
    debtToIncomeRatio: 0.25,
    downPaymentPercent: 0.2,
    emergencyFundMonths: 6,
    creditScore: 750,
    lifeStability: 8,
    confidenceLevel: 7,
    partnerAlignment: 9,
    fomoLevel: 3,
    timeHorizonMonths: 18,
    savingsRate: 0.22,
    downPaymentProgress: 0.85,
  },
};

describe("POST /api/simulator (6.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns current + simulated + rank matching local helpers", async () => {
    const levers = { ...BASELINE, liquidSavings: 20000, totalDebt: 15000 };
    const { POST } = await import("@/app/api/simulator/route");
    const res = await POST(
      new Request("http://localhost/api/simulator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          baseline: BASELINE,
          anchorAssessment: ANCHOR,
          levers,
          include: { current: true, simulated: true, rank: true, anchors: true },
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    const anchors = deriveAnchors(ANCHOR);
    expect(body.current).toEqual(simulate(BASELINE, BASELINE, anchors));
    expect(body.simulated).toEqual(simulate(levers, BASELINE, anchors));
    expect(body.impacts).toEqual(rankLevers(levers, BASELINE, anchors));
    expect(body.anchors.neutral).toBe(false);
    expect(body.anchors.emotionalScore).toBe(20);
  });

  it("returns housing readiness band matching readinessImpactForHousing", async () => {
    const { POST } = await import("@/app/api/simulator/route");
    const housing = { monthlyObligation: 2500, upfrontCost: 10000 };
    const res = await POST(
      new Request("http://localhost/api/simulator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          baseline: seedBaseline(null, {
            monthlyIncome: 6000,
            monthlyExpenses: 3000,
            monthlyDebtPayments: 500,
            liquidSavings: 21000,
            totalDebt: 15000,
          }),
          anchorAssessment: null,
          include: {
            current: false,
            simulated: false,
            rank: false,
            anchors: false,
            housing,
          },
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const baseline = seedBaseline(null, {
      monthlyIncome: 6000,
      monthlyExpenses: 3000,
      monthlyDebtPayments: 500,
      liquidSavings: 21000,
      totalDebt: 15000,
    });
    const expected = readinessImpactForHousing(baseline, deriveAnchors(null), housing);
    expect(body.housing).toEqual(expected);
  });

  it("runs preflight without a baseline", async () => {
    const { POST } = await import("@/app/api/simulator/route");
    const preflight = {
      monthlyIncome: 4000,
      monthlyExpenses: 3500,
      monthlyDebtPayments: 800,
      liquidSavings: 10000,
    };
    const res = await POST(
      new Request("http://localhost/api/simulator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preflight }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preflight).toEqual(runPreflight(preflight));
    expect(body.preflight.verdict).toBe("DO_NOT_PROCEED");
  });

  it("rejects invalid JSON shape with 400", async () => {
    const { POST } = await import("@/app/api/simulator/route");
    const res = await POST(
      new Request("http://localhost/api/simulator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ baseline: { monthlyIncome: "nope" } }),
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("client graph guards (6.4)", () => {
  it("ScoreSimulator and readiness hooks avoid engine modules", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const strip = (raw: string) =>
      raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

    for (const rel of [
      "components/simulator/ScoreSimulator.tsx",
      "hooks/use-readiness.ts",
      "hooks/use-housing-readiness.ts",
      "app/(product)/tools/preflight/page.tsx",
      "app/(product)/tools/mortgage/page.tsx",
      "app/(product)/tools/affordability/page.tsx",
    ]) {
      const src = strip(readFileSync(join(process.cwd(), rel), "utf8"));
      expect(src, rel).not.toMatch(/from\s+["']@\/lib\/simulator["']/);
      expect(src, rel).not.toMatch(/from\s+["']@\/lib\/scoring["']/);
      expect(src, rel).not.toMatch(/from\s+["']@\/lib\/tools\/readiness-bands["']/);
      expect(src, rel).not.toMatch(/\bcomputeScore\b/);
      expect(src, rel).not.toMatch(/\bsimulate\b\s*\(/);
    }

    const sim = strip(readFileSync(join(process.cwd(), "components/simulator/ScoreSimulator.tsx"), "utf8"));
    expect(sim).toMatch(/fetchSimulatorBatch/);
    expect(sim).toMatch(/@\/lib\/simulator\/public/);
  });
});
