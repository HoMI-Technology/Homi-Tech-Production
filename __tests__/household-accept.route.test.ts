import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Route tests for POST /api/household/accept.
 *
 * The invite token is a bearer credential, and invite email arrives by mail —
 * a medium that gets forwarded. Holding the token therefore cannot be
 * sufficient authorization: the accepting session must also BE the invited
 * recipient, or a forwarded link silently grants a stranger access to the
 * household's financial picture.
 */

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  user: null as { id: string; email?: string } | null,
  existingMember: null as Row | null,
  invite: null as Row | null,
  insertRows: [] as Row[],
  insertError: null as { message: string } | null,
  inviteUpdates: [] as Row[],
  rateLimitAllowed: true,
}));

vi.mock("@/lib/ratelimit", () => ({
  getClientIp: () => "127.0.0.1",
  rateLimit: async () => ({ allowed: state.rateLimitAllowed }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === "household_members") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.existingMember, error: null }),
            }),
          }),
          insert: async (row: Row) => {
            if (state.insertError) return { error: state.insertError };
            state.insertRows.push(row);
            return { error: null };
          },
        };
      }
      if (table === "household_invites") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.invite, error: null }),
            }),
          }),
          update: (patch: Row) => ({
            eq: async () => {
              state.inviteUpdates.push(patch);
              return { error: null };
            },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { POST } from "@/app/api/household/accept/route";

const TOKEN = "t".repeat(32);

function request(body: unknown) {
  return new Request("http://localhost/api/household/accept", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function pendingInvite(email: string): Row {
  return {
    id: "invite-1",
    household_id: "household-1",
    status: "pending",
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    email,
  };
}

beforeEach(() => {
  state.user = { id: "user-1", email: "invited@example.com" };
  state.existingMember = null;
  state.invite = pendingInvite("invited@example.com");
  state.insertRows = [];
  state.insertError = null;
  state.inviteUpdates = [];
  state.rateLimitAllowed = true;
});

describe("POST /api/household/accept — recipient binding", () => {
  it("accepts when the session email matches the invited email", async () => {
    const res = await POST(request({ token: TOKEN }));
    expect(res.status).toBe(200);
    expect(state.insertRows).toHaveLength(1);
    expect(state.insertRows[0]).toMatchObject({
      household_id: "household-1",
      user_id: "user-1",
      role: "partner",
    });
    expect(state.inviteUpdates).toEqual([{ status: "accepted" }]);
  });

  it("403s a forwarded invite opened by a different account", async () => {
    state.user = { id: "attacker-1", email: "attacker@example.com" };
    const res = await POST(request({ token: TOKEN }));
    expect(res.status).toBe(403);
    // The join must not happen and the invite must remain pending/reusable
    // by its real recipient.
    expect(state.insertRows).toHaveLength(0);
    expect(state.inviteUpdates).toHaveLength(0);
  });

  it("matches email case-insensitively", async () => {
    state.user = { id: "user-1", email: "Invited@Example.COM" };
    const res = await POST(request({ token: TOKEN }));
    expect(res.status).toBe(200);
    expect(state.insertRows).toHaveLength(1);
  });

  it("ignores surrounding whitespace on either side", async () => {
    state.user = { id: "user-1", email: "  invited@example.com  " };
    const res = await POST(request({ token: TOKEN }));
    expect(res.status).toBe(200);
  });

  it("403s — fails closed — when the session has no email", async () => {
    state.user = { id: "user-1" };
    const res = await POST(request({ token: TOKEN }));
    expect(res.status).toBe(403);
    expect(state.insertRows).toHaveLength(0);
  });

  it("403s — fails closed — when the invite row carries no email", async () => {
    state.invite = { ...pendingInvite("x@example.com"), email: null };
    const res = await POST(request({ token: TOKEN }));
    expect(res.status).toBe(403);
    expect(state.insertRows).toHaveLength(0);
  });

  it("does not leak the invited address in the rejection body", async () => {
    state.user = { id: "attacker-1", email: "attacker@example.com" };
    const res = await POST(request({ token: TOKEN }));
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("invited@example.com");
  });
});

describe("POST /api/household/accept — preconditions still hold", () => {
  it("401s an unauthenticated caller", async () => {
    state.user = null;
    const res = await POST(request({ token: TOKEN }));
    expect(res.status).toBe(401);
  });

  it("429s when rate limited", async () => {
    state.rateLimitAllowed = false;
    const res = await POST(request({ token: TOKEN }));
    expect(res.status).toBe(429);
  });

  it("404s an unknown token", async () => {
    state.invite = null;
    const res = await POST(request({ token: TOKEN }));
    expect(res.status).toBe(404);
  });

  it("404s a non-pending invite", async () => {
    state.invite = { ...pendingInvite("invited@example.com"), status: "revoked" };
    const res = await POST(request({ token: TOKEN }));
    expect(res.status).toBe(404);
  });

  it("410s an expired invite before checking identity", async () => {
    state.invite = {
      ...pendingInvite("invited@example.com"),
      expires_at: new Date(Date.now() - 1000).toISOString(),
    };
    const res = await POST(request({ token: TOKEN }));
    expect(res.status).toBe(410);
  });

  it("409s a user who already belongs to a household", async () => {
    state.existingMember = { household_id: "other-household" };
    const res = await POST(request({ token: TOKEN }));
    expect(res.status).toBe(409);
    expect(state.insertRows).toHaveLength(0);
  });

  it("400s a malformed token", async () => {
    const res = await POST(request({ token: "short" }));
    expect(res.status).toBe(400);
  });
});
