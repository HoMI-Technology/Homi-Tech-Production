import { describe, it, expect } from "vitest";

/**
 * ACCEPTANCE (integration, opt-in) — household membership authorization.
 *
 * Target: supabase/migrations/20260802000004_household_authorization_reconciled.sql
 *
 * These are the only tests that can prove that migration. Its entire effect
 * lives in RLS policies, column grants and unique indexes, none of which a
 * mocked Supabase client exercises: __tests__/household-accept.route.test.ts
 * proves the route's *logic* while mocking away the layer this migration
 * changes.
 *
 * Requires a live NON-PRODUCTION Supabase project with the migration applied
 * and seeded users. Skipped unless RUN_RLS_IT=1 and the env below are set, so
 * it never blocks the default run — mirroring
 * __tests__/acceptance/rls-harness.test.ts. `npm run test` excludes
 * __tests__/acceptance/** entirely; these run only under
 * `npm run test:acceptance`.
 *
 * NEVER point these at Supabase project ref giyycykxkzfbowiapxpd. That is the
 * production project; these specs write membership rows.
 *
 * Env: RUN_RLS_IT=1, SUPABASE_URL, USER_A_JWT, USER_B_JWT, HOUSEHOLD_A_ID.
 *   A = owner of HOUSEHOLD_A_ID. B = a signed-in user who was never invited.
 * Optional:
 *   USER_B_EMAIL          — enables the invite-visibility leg (HH-001c).
 *   INVITE_TOKEN_FOR_B    — a pending, unexpired invite on HOUSEHOLD_A_ID
 *                           addressed to B's email; enables HH-005/006.
 *   HOUSEHOLD_B_ID        — a household B already belongs to; with
 *                           INVITE_TOKEN_FOR_B this enables HH-007.
 *   USER_C_JWT +
 *   INVITE_TOKEN_FOR_C    — a third user holding a live invite to a household
 *                           that is already full; enables HH-008.
 *   PARTNER_JWT           — a non-owner member of HOUSEHOLD_A_ID; enables
 *                           HH-009.
 *   EMPTY_HOUSEHOLD_C_ID +
 *   USER_C_JWT            — a households row created_by C with NO member rows
 *                           yet; enables HH-011, the blocking open-risk probe.
 *
 * A NOTE ON "NO ROWS VISIBLE" ASSERTIONS. Every one of them asserts BOTH that
 * the query SUCCEEDED and that it returned nothing. `data` empty on its own
 * also holds when the query ERRORED — a wrong table name, a dropped
 * connection, an expired JWT — so emptiness alone is a false pass that proves
 * nothing about RLS. RLS must FILTER to zero rows, not FAIL to zero rows.
 */

const enabled =
  process.env.RUN_RLS_IT === "1" &&
  !!process.env.SUPABASE_URL &&
  !!process.env.USER_A_JWT &&
  !!process.env.USER_B_JWT &&
  !!process.env.HOUSEHOLD_A_ID;

const inviteEnabled = enabled && !!process.env.INVITE_TOKEN_FOR_B;
const emailEnabled = enabled && !!process.env.USER_B_EMAIL;
const ownerSeatEnabled =
  enabled && !!process.env.USER_C_JWT && !!process.env.EMPTY_HOUSEHOLD_C_ID;

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

/**
 * HH-011 — THE BLOCKING ONE. Run this first.
 *
 * The owner leg of household_members_insert_self reads `households` in a
 * subquery, which is evaluated under the CALLER's RLS. households_member_select
 * (00039) requires membership, and a creator is not a member until this very
 * insert lands. If RLS filters that subselect, household creation breaks
 * outright and the migration must not be applied until the OPEN RISK section of
 * the migration header is resolved — resolution (ii), a creator-scoped SELECT
 * policy on households, is the recommended fix.
 *
 * A failure here is not a test bug. It is the answer to the open question.
 */
describe.skipIf(!ownerSeatEnabled)("HH — a creator can seat themselves as owner", () => {
  it("HH-011: the creator of an empty household can insert their own owner row", async () => {
    const c = await client(process.env.USER_C_JWT!);
    const cId = await userId(process.env.USER_C_JWT!);

    const { error } = await c.from("household_members").insert({
      household_id: process.env.EMPTY_HOUSEHOLD_C_ID!,
      user_id: cId,
      role: "owner",
      display_name: "Partner A",
    });

    expect(error).toBeNull();
  });

  it("HH-011b: and can read back the household row they created", async () => {
    const c = await client(process.env.USER_C_JWT!);
    const { error, data } = await c
      .from("households")
      .select("id, created_by")
      .eq("id", process.env.EMPTY_HOUSEHOLD_C_ID!);

    // The same visibility gap, one step earlier: app/api/household/route.ts
    // does .insert(...).select(...), and INSERT ... RETURNING applies SELECT
    // policies. If this is empty, POST /api/household is already failing today.
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(1);
  });
});

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

    // Denied by household_members_insert_self: no live invite addressed to B.
    expect(error).toBeTruthy();
  });

  it("HH-001b: and therefore cannot read that household's members", async () => {
    const b = await client(process.env.USER_B_JWT!);
    const { error, data } = await b
      .from("household_members")
      .select("user_id, last_score, last_verdict")
      .eq("household_id", process.env.HOUSEHOLD_A_ID!);

    // The whole point of HH-001: no membership row means no cross-tenant read
    // of another household's readiness figures. Both halves asserted — see the
    // note at the top of this file.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it.skipIf(!emailEnabled)(
    "HH-001c: nor that household's invite addresses and tokens",
    async () => {
      const b = await client(process.env.USER_B_JWT!);
      const { error, data } = await b
        .from("household_invites")
        .select("email, token")
        .eq("household_id", process.env.HOUSEHOLD_A_ID!);

      // B may legitimately see an invite addressed to B
      // (household_invites_recipient_select). B must never see one addressed to
      // anybody else — that is the token/address leak HH-001 opens up.
      //
      // The query must SUCCEED: if it errored, the filter below would be
      // trivially satisfied over an empty array and would prove nothing.
      expect(error).toBeNull();
      const mine = process.env.USER_B_EMAIL!.toLowerCase();
      const foreign = (data ?? []).filter((r) => String(r.email).toLowerCase() !== mine);
      expect(foreign).toEqual([]);
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

    // If this fails, the column grants have broken
    // app/api/household/sync-score/route.ts.
    expect(error).toBeNull();
  });
});

describe.skipIf(!inviteEnabled)("HH — the invitation path works for its recipient", () => {
  it("HH-005: the invited recipient can read the invite addressed to them", async () => {
    const b = await client(process.env.USER_B_JWT!);
    const { error, data } = await b
      .from("household_invites")
      .select("id, household_id, status, expires_at, email")
      .eq("token", process.env.INVITE_TOKEN_FOR_B!)
      .maybeSingle();

    // Before this migration the row was invisible to its intended recipient, so
    // the accept route answered 404 and the flow could never complete.
    expect(error).toBeNull();
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

/**
 * Integrity bounds. These sit on top of the entitlement policies: an invitation
 * is necessary to join, and these assert it is not sufficient.
 */

describe.skipIf(!(inviteEnabled && process.env.HOUSEHOLD_B_ID))(
  "HH — a user belongs to at most one household",
  () => {
    it("HH-007: an invited user who already has a household cannot join a second", async () => {
      const b = await client(process.env.USER_B_JWT!);
      const bId = await userId(process.env.USER_B_JWT!);

      const { error } = await b.from("household_members").insert({
        household_id: process.env.HOUSEHOLD_A_ID!,
        user_id: bId,
        role: "partner",
        display_name: "second household",
      });

      // Blocked by household_members_one_per_user, not by the invite check — B
      // holds a valid invitation here. Without the index the four household
      // routes' .maybeSingle() calls would start erroring for B.
      expect(error).toBeTruthy();
    });
  },
);

describe.skipIf(!(enabled && process.env.USER_C_JWT && process.env.INVITE_TOKEN_FOR_C))(
  "HH — membership is capped at two",
  () => {
    it("HH-008: an invited third member cannot join a full household", async () => {
      const c = await client(process.env.USER_C_JWT!);
      const cId = await userId(process.env.USER_C_JWT!);

      const { error } = await c.from("household_members").insert({
        household_id: process.env.HOUSEHOLD_A_ID!,
        user_id: cId,
        role: "partner",
        display_name: "third wheel",
      });

      // Blocked by household_one_partner_per_household. The cap is enforced by
      // a partial unique index rather than a count(*) inside WITH CHECK
      // precisely because only the index survives concurrent accepts — if this
      // test is ever rewritten to run two accepts in parallel, the index is
      // what it proves.
      //
      // A third member would be dropped from lib/household/dual-score.ts's
      // memberA/memberB verdict without trace — including their hard stops.
      expect(error).toBeTruthy();
    });
  },
);

describe.skipIf(!enabled)("HH — invitations are visible only to the owner", () => {
  it.skipIf(!process.env.PARTNER_JWT)(
    "HH-009: a partner cannot read their household's invite tokens",
    async () => {
      const p = await client(process.env.PARTNER_JWT!);
      const { error, data } = await p
        .from("household_invites")
        .select("email, token")
        .eq("household_id", process.env.HOUSEHOLD_A_ID!);

      // A token is the routing credential for an invitation. Before this
      // migration any member could read every one of them.
      //
      // As in HH-001b: assert the query SUCCEEDED and returned nothing, not
      // merely that nothing came back.
      expect(error).toBeNull();
      expect(data).toEqual([]);
    },
  );

  it("HH-010: the owner can still read their household's invitations", async () => {
    const a = await client(process.env.USER_A_JWT!);
    const { error, data } = await a
      .from("household_invites")
      .select("id, email, status")
      .eq("household_id", process.env.HOUSEHOLD_A_ID!);

    // Regression guard on the narrowed USING: invite/route.ts does
    // INSERT ... .select(), which needs the owner to retain SELECT.
    expect(error).toBeNull();
    if (process.env.INVITE_TOKEN_FOR_B) {
      expect((data ?? []).length).toBeGreaterThan(0);
    }
  });
});
