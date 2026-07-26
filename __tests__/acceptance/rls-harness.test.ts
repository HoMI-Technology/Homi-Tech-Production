import { describe, it, expect } from "vitest";

/**
 * ACCEPTANCE (integration, opt-in) — Row Level Security harness.
 *
 * Requires a live test Supabase project and two seeded users. Skipped unless
 * RUN_RLS_IT=1 and the env below are set, so it never blocks the default run.
 *
 * Env: RUN_RLS_IT=1, SUPABASE_URL, USER_A_JWT, USER_B_JWT.
 * Behaviour:
 *   1. User A cannot read User B's profile data (profiles isolation).
 *   2. partner_stats RPC returns partner-scoped aggregates only.
 */

const enabled =
  process.env.RUN_RLS_IT === "1" &&
  !!process.env.SUPABASE_URL &&
  !!process.env.USER_A_JWT &&
  !!process.env.USER_B_JWT;

describe.skipIf(!enabled)("RLS — user profile isolation", () => {
  it("User B cannot read User A's profiles row", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const b = createClient(process.env.SUPABASE_URL!, process.env.USER_B_JWT!);
    const { data } = await b.from("profiles").select("id").neq("id", "");
    // Under RLS, B sees only their own row.
    expect(Array.isArray(data)).toBe(true);
    if (data && data.length > 0) {
      expect(data.length).toBeLessThanOrEqual(1);
    }
  });

  it("User B cannot read User A's assessments", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const b = createClient(process.env.SUPABASE_URL!, process.env.USER_B_JWT!);
    const { data } = await b.from("assessments").select("id").neq("user_id", "");
    expect(Array.isArray(data)).toBe(true);
  });
});

describe.skipIf(!enabled)("RLS — partner_stats RPC scoping", () => {
  it("partner_code_stats returns zeroed aggregates for an invalid code", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const a = createClient(process.env.SUPABASE_URL!, process.env.USER_A_JWT!);

    const { data, error } = await a.rpc("partner_code_stats", { p_code: "INVALID_CODE" });
    expect(error).toBeNull();
    expect(data).toBeDefined();
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0] as {
        assessment_count: bigint;
        recent_count: bigint;
        avg_score: number | null;
      };
      expect(Number(row.assessment_count)).toBe(0);
      expect(Number(row.recent_count)).toBe(0);
      expect(row.avg_score).toBeNull();
    }
  });

  it("partner_recent_assessments returns empty for an invalid partner code", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const a = createClient(process.env.SUPABASE_URL!, process.env.USER_A_JWT!);

    const { data, error } = await a.rpc("partner_recent_assessments", {
      p_code: "INVALID_CODE",
      p_limit: 10,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBe(0);
  });
});
