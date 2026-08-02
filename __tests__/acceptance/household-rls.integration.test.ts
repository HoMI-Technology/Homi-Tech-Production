import { describe, it, expect } from "vitest";

/**
 * ACCEPTANCE (integration, opt-in) — household membership authorization (00042).
 *
 * These are the only tests that can prove 00042. Its entire effect lives in
 * RLS policies and column grants, which no mocked Supabase client exercises:
 * __tests__/household-accept.route.test.ts proves the route's *logic* while
 * mocking away the layer this migration changes.
 *
 * Requires a live NON-PRODUCTION Supabase project with 00042 applied and two
 * seeded users. Skipped unless RUN_RLS_IT=1 and the env below are set, so it
 * never blocks the default run — mirroring __tests__/acceptance/rls-harness.test.ts.
 *
 * NEVER point these at Supabase project ref giyycykxkzfbowiapxpd. That is the
 * production project; these specs write membership rows.
 *
 * Env: RUN_RLS_IT=1, SUPABASE_URL, USER_A_JWT, USER_B_JWT, HOUSEHOLD_A_ID.
 *   A = owner of HOUSEHOLD_A_ID. B = a signed-in user who was never invited.
 * Optional:
 *   USER_B_EMAIL        — enables the invite-visibility leg (HH-001c).
 *   INVITE_TOKEN_FOR_B  — a pending, unexpired invite on HOUSEHOLD_A_ID
 *                         addressed to B's email; enables HH-005/006.
 */

const enabled =
  process.env.RUN_RLS_IT === "1" &&
  !!process.env.SUPABASE_URL &&
  !!process.env.USER_A_JWT &&
  !!process.env.USER_B_JWT &&
  !!process.env.HOUSEHOLD_A_ID;

const inviteEnabled = enabled && !!process.env.INVITE_TOKEN_FOR_B;
const emailEnabled = enabled && !!process.env.USER_B_EMAIL;

async function client(jwt: string) {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL!, jwt);
}

async function userId(jwt: string) {
  const c = await client(jwt);
  const {
    data: { user },
  } = await c.auth.getUser();
  return user?.id;
}

describe.skipIf(!enabled)("HH — membership cannot be self-granted", () => {
  it("HH-001: an uninvited user cannot insert themselves into a household", async () => {
    const b = await client(process.env.USER_B_JWT!);
    const bId = await userId(process.env.USER_B_JWT!);

    const { error } = await b.from("household_members").insert({
      household_id: process.env.HOUSEHOLD_A_ID!,
      user_id: bId,
      role: "partner",
      display_name: "uninvited",
    });

    // Denied by household_members_insert_self -> household_join_allowed().
    expect(error).toBeTruthy();
  });

  it("HH-001b: and therefore cannot read that household's members", async () => {
    const b = await client(process.env.USER_B_JWT!);
    const { data } = await b
      .from("household_members")
      .select("user_id, last_score, last_verdict")
      .eq("household_id", process.env.HOUSEHOLD_A_ID!);

    // The whole point of HH-001: no membership row means no cross-tenant read
    // of another household's readiness figures.
    expect(data ?? []).toHaveLength(0);
  });

  it.skipIf(!emailEnabled)(
    "HH-001c: nor that household's invite addresses and tokens",
    async () => {
      const b = await client(process.env.USER_B_JWT!);
      const { data } = await b
        .from("household_invites")
        .select("email, token")
        .eq("household_id", process.env.HOUSEHOLD_A_ID!);

      // B may legitimately see an invite addressed to B
      // (household_invites_recipient_select). B must never see one addressed
      // to anybody else — that is the token/address leak HH-001 opens up.
      const mine = process.env.USER_B_EMAIL!.toLowerCase();
      const foreign = (data ?? []).filter((r) => String(r.email).toLowerCase() !== mine);
      expect(foreign).toHaveLength(0);
    },
  );
});

describe.skipIf(!enabled)("HH — membership cannot be escalated after the fact", () => {
  it("HH-002: a member cannot move their own row to another household", async () => {
    const b = await client(process.env.USER_B_JWT!);
    const bId = await userId(process.env.USER_B_JWT!);

    const { error } = await b
      .from("household_members")
      .update({ household_id: process.env.HOUSEHOLD_A_ID! })
      .eq("user_id", bId);

    // household_id is not in the UPDATE column grant -> 42501.
    expect(error).toBeTruthy();
  });

  it("HH-003: a member cannot promote themselves to owner", async () => {
    const b = await client(process.env.USER_B_JWT!);
    const bId = await userId(process.env.USER_B_JWT!);

    const { error } = await b
      .from("household_members")
      .update({ role: "owner" })
      .eq("user_id", bId);

    // role is not in the UPDATE column grant -> 42501.
    expect(error).toBeTruthy();
  });

  it("HH-004: the columns sync-score writes are still writable (no regression)", async () => {
    const a = await client(process.env.USER_A_JWT!);
    const aId = await userId(process.env.USER_A_JWT!);

    const { error } = await a
      .from("household_members")
      .update({
        last_score: 71,
        last_verdict: "ALMOST_THERE",
        last_assessment_at: new Date().toISOString(),
        display_name: "Partner A",
      })
      .eq("user_id", aId);

    // If this fails, 00042's grants have broken
    // app/api/household/sync-score/route.ts.
    expect(error).toBeNull();
  });
});

describe.skipIf(!inviteEnabled)("HH — the invitation path works for its recipient", () => {
  it("HH-005: the invited recipient can read the invite addressed to them", async () => {
    const b = await client(process.env.USER_B_JWT!);
    const { data } = await b
      .from("household_invites")
      .select("id, household_id, status, expires_at, email")
      .eq("token", process.env.INVITE_TOKEN_FOR_B!)
      .maybeSingle();

    // Before 00042 this returned null for the intended recipient, so the
    // accept route answered 404 and the flow could never complete.
    expect(data).toBeTruthy();
    expect(data?.status).toBe("pending");
  });

  it("HH-006: the recipient can only transition their invite to 'accepted'", async () => {
    const b = await client(process.env.USER_B_JWT!);

    const { error: revokeErr } = await b
      .from("household_invites")
      .update({ status: "revoked" })
      .eq("token", process.env.INVITE_TOKEN_FOR_B!);

    // WITH CHECK pins the destination state; 'revoked' is the owner's call.
    expect(revokeErr).toBeTruthy();
  });

  it("HH-006b: and cannot rewrite the address the invite was issued to", async () => {
    const b = await client(process.env.USER_B_JWT!);

    const { error } = await b
      .from("household_invites")
      .update({ email: "attacker@example.com" })
      .eq("token", process.env.INVITE_TOKEN_FOR_B!);

    // email is not in the UPDATE column grant -> 42501.
    expect(error).toBeTruthy();
  });
});
