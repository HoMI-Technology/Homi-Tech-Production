import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Route tests for /api/cron/score-triggers — the periodic detector that flags
 * users whose synced finance numbers crossed a scoring band since their last
 * completed assessment. Detection plus dedupe via score_trigger_notifications:
 * no scoring, no email side effects.
 */

type AssessmentRow = {
  id: string;
  user_id: string;
  inputs: Record<string, unknown> | null;
  completed_at: string | null;
  created_at: string;
};

type FinanceRow = { user_id: string; state: Record<string, unknown> };

type NotificationRow = { user_id: string; trigger_signature: string };

const state = vi.hoisted(() => ({
  assessments: [] as AssessmentRow[],
  assessmentsError: null as { message: string } | null,
  financeRows: [] as FinanceRow[],
  financeError: null as { message: string } | null,
  existingNotifications: [] as NotificationRow[],
  notificationsError: null as { message: string } | null,
  insertError: null as { message: string } | null,
  insertedRows: [] as NotificationRow[],
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "assessments") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          not: () => chain,
          order: () => chain,
          limit: async () => ({ data: state.assessments, error: state.assessmentsError }),
        };
        return chain;
      }
      if (table === "user_finance_state") {
        const chain = {
          select: () => chain,
          in: async () => ({ data: state.financeRows, error: state.financeError }),
        };
        return chain;
      }
      if (table === "score_trigger_notifications") {
        const chain = {
          select: () => chain,
          in: async () => ({
            data: state.existingNotifications,
            error: state.notificationsError,
          }),
          upsert: async (rows: NotificationRow[]) => {
            state.insertedRows.push(...rows);
            return { error: state.insertError };
          },
        };
        return chain;
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { GET } from "@/app/api/cron/score-triggers/route";

const BASELINE_INPUTS = { debtToIncomeRatio: 0.3, emergencyFundMonths: 2, savingsRate: 0.08 };

const CROSSED_FINANCE: Record<string, unknown> = {
  monthlyIncome: 5000,
  monthlyExpenses: 4400,
  monthlyDebtPayments: 250, // DTI 5% — band 0, down from band 1
  liquidSavings: 6500, // runway ~1.4mo — still band 1; savings 7% — still band 1
  totalDebt: 5000,
  expenseCategories: [],
  downPaymentTarget: 60000,
  monteCarloYears: 5,
  expectedReturnPct: 5,
  volatilityPct: 8,
  assets: [],
  liabilities: [],
};

function request(auth?: string) {
  return new Request("http://localhost/api/cron/score-triggers", {
    headers: auth ? { authorization: auth } : {},
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = "test-cron-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  state.assessments = [];
  state.assessmentsError = null;
  state.financeRows = [];
  state.financeError = null;
  state.existingNotifications = [];
  state.notificationsError = null;
  state.insertError = null;
  state.insertedRows = [];
});

describe("GET /api/cron/score-triggers", () => {
  it("rejects requests without the cron secret", async () => {
    const noAuth = await GET(request());
    expect(noAuth.status).toBe(401);
    const wrongAuth = await GET(request("Bearer nope"));
    expect(wrongAuth.status).toBe(401);
  });

  it("returns 503 when the service role is not configured", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await GET(request("Bearer test-cron-secret"));
    expect(res.status).toBe(503);
  });

  it("flags users whose finance numbers crossed a band since the last assessment", async () => {
    state.assessments = [
      {
        id: "a-1",
        user_id: "user-1",
        inputs: { ...BASELINE_INPUTS },
        completed_at: "2026-08-01T00:00:00.000Z",
        created_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    state.financeRows = [{ user_id: "user-1", state: CROSSED_FINANCE }];

    const res = await GET(request("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidates).toBe(1);
    expect(body.compared).toBe(1);
    expect(body.flagged).toBe(1);
    expect(body.notified).toBe(1);
    expect(body.triggers[0]).toMatchObject({
      userId: "user-1",
      assessmentId: "a-1",
      metrics: ["dti"],
    });
    expect(body.triggers[0].estimatedPointImpact).toBeGreaterThan(0);
    expect(state.insertedRows).toEqual([
      { user_id: "user-1", trigger_signature: "band:a-1:dti" },
    ]);
  });

  it("does not re-flag a crossing whose signature was already recorded", async () => {
    state.assessments = [
      {
        id: "a-1",
        user_id: "user-1",
        inputs: { ...BASELINE_INPUTS },
        completed_at: "2026-08-01T00:00:00.000Z",
        created_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    state.financeRows = [{ user_id: "user-1", state: CROSSED_FINANCE }];
    state.existingNotifications = [
      { user_id: "user-1", trigger_signature: "band:a-1:dti" },
    ];

    const res = await GET(request("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.flagged).toBe(1); // crossing still detected…
    expect(body.notified).toBe(0); // …but deduped out of the notify set
    expect(body.triggers).toEqual([]);
    expect(state.insertedRows).toEqual([]);
  });

  it("flags again when a new assessment changes the signature", async () => {
    state.assessments = [
      {
        id: "a-2", // newer assessment than the recorded notification
        user_id: "user-1",
        inputs: { ...BASELINE_INPUTS },
        completed_at: "2026-08-10T00:00:00.000Z",
        created_at: "2026-08-10T00:00:00.000Z",
      },
    ];
    state.financeRows = [{ user_id: "user-1", state: CROSSED_FINANCE }];
    state.existingNotifications = [
      { user_id: "user-1", trigger_signature: "band:a-1:dti" },
    ];

    const res = await GET(request("Bearer test-cron-secret"));
    const body = await res.json();
    expect(body.flagged).toBe(1);
    expect(body.notified).toBe(1);
    expect(state.insertedRows).toEqual([
      { user_id: "user-1", trigger_signature: "band:a-2:dti" },
    ]);
  });

  it("still flags but does not count as notified when the dedupe insert fails", async () => {
    state.assessments = [
      {
        id: "a-1",
        user_id: "user-1",
        inputs: { ...BASELINE_INPUTS },
        completed_at: "2026-08-01T00:00:00.000Z",
        created_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    state.financeRows = [{ user_id: "user-1", state: CROSSED_FINANCE }];
    state.insertError = { message: "relation does not exist" };

    const res = await GET(request("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.flagged).toBe(1);
    expect(body.notified).toBe(0);
    expect(body.triggers).toHaveLength(1);
  });

  it("flags everything when the dedupe lookup fails", async () => {
    state.assessments = [
      {
        id: "a-1",
        user_id: "user-1",
        inputs: { ...BASELINE_INPUTS },
        completed_at: "2026-08-01T00:00:00.000Z",
        created_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    state.financeRows = [{ user_id: "user-1", state: CROSSED_FINANCE }];
    state.notificationsError = { message: "relation does not exist" };

    const res = await GET(request("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.flagged).toBe(1);
    expect(body.notified).toBe(1);
  });

  it("does not flag users whose bands are unchanged or whose baseline is unreadable", async () => {
    state.assessments = [
      {
        id: "a-1",
        user_id: "user-1",
        inputs: { ...BASELINE_INPUTS },
        completed_at: "2026-08-01T00:00:00.000Z",
        created_at: "2026-08-01T00:00:00.000Z",
      },
      {
        id: "a-2",
        user_id: "user-2",
        inputs: { decisionType: "home" }, // unreadable baseline
        completed_at: "2026-08-01T00:00:00.000Z",
        created_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    state.financeRows = [
      {
        user_id: "user-1",
        state: {
          ...CROSSED_FINANCE,
          monthlyExpenses: 3000,
          monthlyDebtPayments: 1600, // DTI 32% — still band 1
          liquidSavings: 9600, // runway ~2.1mo — band 1; savings 8% — band 1
        },
      },
      { user_id: "user-2", state: CROSSED_FINANCE },
    ];

    const res = await GET(request("Bearer test-cron-secret"));
    const body = await res.json();
    expect(body.candidates).toBe(2);
    expect(body.compared).toBe(1);
    expect(body.flagged).toBe(0);
    expect(body.triggers).toEqual([]);
  });

  it("uses only the latest assessment per user", async () => {
    state.assessments = [
      {
        id: "a-new",
        user_id: "user-1",
        inputs: { debtToIncomeRatio: 0.05, emergencyFundMonths: 2, savingsRate: 0.07 },
        completed_at: "2026-08-10T00:00:00.000Z",
        created_at: "2026-08-10T00:00:00.000Z",
      },
      {
        id: "a-old",
        user_id: "user-1",
        inputs: { ...BASELINE_INPUTS },
        completed_at: "2026-08-01T00:00:00.000Z",
        created_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    state.financeRows = [{ user_id: "user-1", state: CROSSED_FINANCE }];

    const res = await GET(request("Bearer test-cron-secret"));
    const body = await res.json();
    // Newest assessment already reflects the 5% DTI — nothing crossed.
    expect(body.candidates).toBe(1);
    expect(body.flagged).toBe(0);
  });

  it("returns 500 with a correlation id when the query fails", async () => {
    state.assessmentsError = { message: "boom" };
    const res = await GET(request("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.correlationId).toEqual(expect.any(String));
  });
});
