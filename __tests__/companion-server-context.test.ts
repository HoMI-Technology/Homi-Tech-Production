/**
 * Authority-flip contracts. What matters: server rows map faithfully into
 * the same context shapes the client builds (pillar percentages, hard-stop
 * messages, freshness from timestamps), each block degrades to null
 * independently, nothing-at-all yields null (so the route falls back to
 * client context), and the assembler never throws.
 */

import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assembleServerContext } from "@/lib/advisor/server-context";

type Result = { data: unknown; error: unknown };

function makeChain(result: Result) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const m of ["select", "order", "limit", "eq"]) chain[m] = self;
  chain.maybeSingle = async () => result;
  chain.then = (resolve: (r: Result) => void) => resolve(result);
  return chain;
}

function makeSupabase(results: Record<string, Result>): SupabaseClient {
  return {
    from(table: string) {
      const result = results[table];
      if (!result) throw new Error(`unexpected table ${table}`);
      return makeChain(result);
    },
  } as unknown as SupabaseClient;
}

const DAY = 86_400_000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

const EMPTY: Record<string, Result> = {
  assessments: { data: [], error: null },
  user_finance_state: { data: null, error: null },
  credit_snapshots: { data: null, error: null },
};

describe("assembleServerContext", () => {
  it("maps assessment rows: pillar percentages, hard-stop messages, previous score, freshness", async () => {
    const supabase = makeSupabase({
      ...EMPTY,
      assessments: {
        data: [
          {
            overall_score: 71,
            verdict: "ALMOST_THERE",
            financial_score: 28, // of 35 -> 80%
            emotional_score: 24, // of 35 -> 69%
            timing_score: 19, // of 30 -> 63%
            hard_stops: [{ code: "dti", message: "DTI above 50%" }],
            completed_at: iso(5 * DAY),
          },
          { overall_score: 63, verdict: "BUILD_FIRST", completed_at: iso(30 * DAY) },
        ],
        error: null,
      },
    });

    const state = await assembleServerContext(supabase);
    expect(state?.assessment?.score).toBe(71);
    expect(state?.assessment?.pillars).toEqual({ financial: 80, emotional: 69, timing: 63 });
    expect(state?.assessment?.hardStops).toEqual(["DTI above 50%"]);
    expect(state?.assessment?.previousScore).toBe(63);
    expect(state?.assessment?.ageDays).toBe(5);
  });

  it("derives finance metrics from the mirrored dashboard state with LWW freshness", async () => {
    const supabase = makeSupabase({
      ...EMPTY,
      user_finance_state: {
        data: {
          state: {
            monthlyIncome: 8000,
            monthlyExpenses: 5000,
            monthlyDebtPayments: 1000,
            liquidSavings: 24000,
            totalDebt: 30000,
            assets: [{ id: "a", name: "Cash", amount: 50000 }],
            liabilities: [{ id: "l", name: "Loans", amount: 30000 }],
          },
          client_updated_at: Date.now() - 3 * DAY,
        },
        error: null,
      },
    });

    const state = await assembleServerContext(supabase);
    expect(state?.finance?.netCashFlow).toBe(2000);
    expect(state?.finance?.runwayMonths).toBe(4);
    expect(state?.finance?.dti).toBe(12.5);
    expect(state?.finance?.netWorth).toBe(20000);
    expect(state?.finance?.ageDays).toBe(3);
  });

  it("maps the latest credit snapshot", async () => {
    const supabase = makeSupabase({
      ...EMPTY,
      credit_snapshots: {
        data: { score: 705, utilization: 22, on_time_streak_months: 18, completed_at: iso(0) },
        error: null,
      },
    });
    const state = await assembleServerContext(supabase);
    expect(state?.credit).toEqual({ score: 705, utilization: 22, onTimeStreakMonths: 18, ageDays: 0 });
  });

  it("returns null when nothing exists server-side — the route falls back to client context", async () => {
    expect(await assembleServerContext(makeSupabase(EMPTY))).toBeNull();
  });

  it("degrades blocks independently on per-table errors, and never throws", async () => {
    const supabase = makeSupabase({
      assessments: { data: null, error: { code: "500" } },
      user_finance_state: { data: null, error: { code: "500" } },
      credit_snapshots: {
        data: { score: 640, utilization: 40, on_time_streak_months: 6, completed_at: iso(DAY) },
        error: null,
      },
    });
    const state = await assembleServerContext(supabase);
    expect(state?.assessment).toBeNull();
    expect(state?.finance).toBeNull();
    expect(state?.credit?.score).toBe(640);

    const exploding = { from: () => { throw new Error("boom"); } } as unknown as SupabaseClient;
    expect(await assembleServerContext(exploding)).toBeNull();
  });

  it("rejects malformed assessment rows rather than inventing context", async () => {
    const supabase = makeSupabase({
      ...EMPTY,
      assessments: {
        data: [{ overall_score: "garbage", verdict: "NOT_A_VERDICT", completed_at: iso(0) }],
        error: null,
      },
    });
    expect(await assembleServerContext(supabase)).toBeNull();
  });
});
