import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeScore, PILLAR_MAX_POINTS, type AssessmentInputs } from "@/lib/scoring";

/**
 * POST /api/shadow-shares contract: the stored card is derived server-side
 * from raw inputs (canon: never trust a client score), stores NO inputs,
 * defaults to the journey card (reveal_score=false), and degrades gracefully
 * without the service role.
 */

let insertedRows: Array<Record<string, unknown>> = [];
let serviceAvailable = true;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () =>
    serviceAvailable
      ? {
          from: () => ({
            insert: (row: Record<string, unknown>) => {
              insertedRows.push(row);
              return {
                select: () => ({
                  single: async () => ({ data: { token: "a".repeat(32) }, error: null }),
                }),
              };
            },
          }),
        }
      : null,
}));

const VALID_INPUTS: AssessmentInputs = {
  debtToIncomeRatio: 0.2,
  downPaymentPercent: 0.1,
  emergencyFundMonths: 4,
  creditScore: 720,
  lifeStability: 7,
  confidenceLevel: 7,
  partnerAlignment: null,
  fomoLevel: 3,
  timeHorizonMonths: 12,
  savingsRate: 0.15,
  downPaymentProgress: 0.5,
};

async function call(body: unknown, ip = "1.2.3.4") {
  const { POST } = await import("@/app/api/shadow-shares/route");
  return POST(
    new Request("https://homitechnology.com/api/shadow-shares", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  insertedRows = [];
  serviceAvailable = true;
});

describe("POST /api/shadow-shares", () => {
  it("recomputes the score server-side and stores derived values only", async () => {
    const res = await call({ inputs: VALID_INPUTS });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { url: string; token: string };
    expect(json.url).toContain(`/shadow/${"a".repeat(32)}`);

    expect(insertedRows).toHaveLength(1);
    const row = insertedRows[0];
    const expected = computeScore(VALID_INPUTS);
    expect(row.score).toBe(expected.score);
    expect(row.verdict).toBe(expected.verdict);
    expect(row.financial_pct).toBe(
      Math.round((expected.financial.total / PILLAR_MAX_POINTS.financial) * 100),
    );
    // No self-reported inputs may ever reach the share row.
    expect(row.inputs).toBeUndefined();
    expect(JSON.stringify(row)).not.toContain("creditScore");
  });

  it("defaults to the journey card (reveal_score=false)", async () => {
    await call({ inputs: VALID_INPUTS });
    expect(insertedRows[0].reveal_score).toBe(false);
  });

  it("honors an explicit reveal opt-in", async () => {
    await call({ inputs: VALID_INPUTS, revealScore: true });
    expect(insertedRows[0].reveal_score).toBe(true);
  });

  it("rejects an invalid payload without touching the DB", async () => {
    const res = await call({ inputs: { creditScore: 9000 } });
    expect(res.status).toBe(400);
    expect(insertedRows).toHaveLength(0);
  });

  it("degrades gracefully when the service role is unavailable", async () => {
    serviceAvailable = false;
    const res = await call({ inputs: VALID_INPUTS }, "9.9.9.9");
    expect(res.status).toBe(503);
  });

  it("rate-limits repeated creations per IP", async () => {
    const ip = "7.7.7.7";
    for (let i = 0; i < 5; i += 1) {
      const res = await call({ inputs: VALID_INPUTS }, ip);
      expect(res.status).toBe(200);
    }
    const blocked = await call({ inputs: VALID_INPUTS }, ip);
    expect(blocked.status).toBe(429);
  });
});
