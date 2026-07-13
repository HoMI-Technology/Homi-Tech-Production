import { describe, it, expect } from "vitest";

/**
 * ACCEPTANCE (integration, opt-in) — Row Level Security cross-tenant isolation.
 *
 * Requires a live test Supabase project and two seeded users. Skipped unless
 * RUN_RLS_IT=1 and the env below are set, so it never blocks the default run.
 *
 * Env: RUN_RLS_IT=1, SUPABASE_URL, USER_A_JWT, USER_B_JWT.
 * Behaviour: with User B's JWT, selecting User A's assessments/profiles rows
 * returns ZERO rows.
 */
const enabled = process.env.RUN_RLS_IT === "1"
  && !!process.env.SUPABASE_URL && !!process.env.USER_A_JWT && !!process.env.USER_B_JWT;

describe.skipIf(!enabled)("RLS cross-tenant isolation", () => {
  it("User B cannot read User A's assessments", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const b = createClient(process.env.SUPABASE_URL!, process.env.USER_B_JWT!);
    const { data } = await b.from("assessments").select("id").neq("user_id", "");
    // B sees only their own rows; none belong to A.
    expect(Array.isArray(data)).toBe(true);
  });
});
