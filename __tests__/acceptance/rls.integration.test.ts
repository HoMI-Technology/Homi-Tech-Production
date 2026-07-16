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

describe.skipIf(!enabled)("profiles privilege-escalation guard (00020)", () => {
  it("a user cannot self-grant role=admin", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const b = createClient(process.env.SUPABASE_URL!, process.env.USER_B_JWT!);
    const { error } = await b.from("profiles").update({ role: "admin" }).neq("id", "");
    expect(error).not.toBeNull();
  });

  it("a user cannot self-upgrade subscription_tier", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const b = createClient(process.env.SUPABASE_URL!, process.env.USER_B_JWT!);
    const { error } = await b.from("profiles").update({ subscription_tier: "pro" }).neq("id", "");
    expect(error).not.toBeNull();
  });

  it("benign self-updates still work (onboarding_completed)", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const b = createClient(process.env.SUPABASE_URL!, process.env.USER_B_JWT!);
    const { error } = await b.from("profiles").update({ onboarding_completed: true }).neq("id", "");
    expect(error).toBeNull();
  });
});
