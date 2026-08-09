/**
 * Plans.md 6.2 — /api/scoring returns the full engine AssessmentResult.
 * Parity: API body mirrors computeScore + insight generators for the same inputs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeScore, generateKeyInsight, generateNextSteps } from "@/lib/scoring";
import type { AssessmentInputs } from "@/lib/scoring";

const SAMPLE: AssessmentInputs = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.2,
  emergencyFundMonths: 6,
  creditScore: 750,
  lifeStability: 8,
  confidenceLevel: 7,
  partnerAlignment: 7,
  fomoLevel: 3,
  timeHorizonMonths: 18,
  savingsRate: 0.15,
  downPaymentProgress: 0.5,
  monthlyHousingRatio: 0.28,
};

vi.mock("@/lib/ratelimit", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 29 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

describe("POST /api/scoring full result (6.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns full pillar breakdowns matching computeScore", async () => {
    const { POST } = await import("@/app/api/scoring/route");
    const req = new Request("http://localhost/api/scoring", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(SAMPLE),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    const engine = computeScore(SAMPLE);
    expect(body.score).toBe(engine.score);
    expect(body.verdict).toBe(engine.verdict);
    expect(body.financial).toEqual(engine.financial);
    expect(body.emotional).toEqual(engine.emotional);
    expect(body.timing).toEqual(engine.timing);
    expect(body.warnings).toEqual(engine.warnings);
    expect(body.hardStops).toEqual(engine.hardStops);
    expect(body.keyInsight).toBe(generateKeyInsight(engine));
    expect(body.nextSteps).toEqual(generateNextSteps(engine));
  });

  it("rejects invalid inputs with 400", async () => {
    const { POST } = await import("@/app/api/scoring/route");
    const req = new Request("http://localhost/api/scoring", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ debtToIncomeRatio: "nope" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("assessment flows do not import the engine (6.2 source guard)", () => {
  it("FullAssessmentFlow and ShadowScoreFlow avoid @/lib/scoring value imports", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    for (const rel of [
      "components/assessment/FullAssessmentFlow.tsx",
      "components/assessment/ShadowScoreFlow.tsx",
    ]) {
      // Strip comments so docs that name computeScore don't false-fail.
      const raw = readFileSync(join(process.cwd(), rel), "utf8");
      const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(src).not.toMatch(/from\s+["']@\/lib\/scoring["']/);
      expect(src).not.toMatch(/\bcomputeScore\b/);
      expect(src).not.toMatch(/\bcomputeShadowScore\b/);
      expect(src).toMatch(/fetchServerScore/);
    }
  });
});

describe("fetchServerScore client helper", () => {
  it("parses a full API payload into AssessmentResult", async () => {
    const engine = computeScore(SAMPLE);
    const payload = {
      score: engine.score,
      verdict: engine.verdict,
      financial: engine.financial,
      emotional: engine.emotional,
      timing: engine.timing,
      warnings: engine.warnings,
      hardStops: engine.hardStops,
      keyInsight: "insight",
      nextSteps: ["a", "b"],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const { fetchServerScore } = await import("@/lib/scoring/client-score");
    const scored = await fetchServerScore(SAMPLE);
    expect(scored.result).toEqual(engine);
    expect(scored.keyInsight).toBe("insight");
    expect(scored.nextSteps).toEqual(["a", "b"]);
    vi.unstubAllGlobals();
  });
});
