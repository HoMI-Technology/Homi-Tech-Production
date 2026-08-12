import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Route tests for POST /api/household/accept.
 * The invite token must be bound to the accepting user's email address;
 * otherwise a leaked/forwarded link lets any signed-in user join a household.
 */

type MemberRow = { household_id: string } | null;
type InviteRow = {
  id: string;
  household_id: string;
  status: string;
  expires_at: string;
  email: string;
} | null;

const state = vi.hoisted(() => ({
  user: null as { id: string; email?: string } | null,
  existingMember: null as MemberRow,
  invite: null as InviteRow,
  insertMemberError: null as { message: string } | null,
  updateInviteError: null as { message: string } | null,
  insertMemberCalls: [] as Record<string, unknown>[],
  updateInviteCalls: [] as { id: string; status: string }[],
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
          insert: (payload: Record<string, unknown>) => {
            state.insertMemberCalls.push(payload);
            return Promise.resolve({ error: state.insertMemberError });
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
          update: (payload: { status: string }) => ({
            eq: (column: string, id: string) => {
              state.updateInviteCalls.push({ id, status: payload.status });
              return Promise.resolve({ error: state.updateInviteError });
            },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

vi.mock("@/lib/ratelimit", () => ({
  getClientIp: () => "203.0.113.7",
  rateLimit: async () => ({ allowed: true }),
}));

import { POST } from "@/app/api/household/accept/route";

const TOKEN = "a-valid-invite-token-32-chars";

const INVITE = {
  id: "invite-1",
  household_id: "hh-1",
  status: "pending",
  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  email: "partner@example.com",
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/household/accept", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  state.user = { id: "user-1", email: "partner@example.com" };
  state.existingMember = null;
  state.invite = INVITE;
  state.insertMemberError = null;
  state.updateInviteError = null;
  state.insertMemberCalls = [];
  state.updateInviteCalls = [];
});

describe("POST /api/household/accept", () => {
  it("401s anonymous callers", async () => {
    state.user = null;
    const res = await POST(postRequest({ token: TOKEN }));
    expect(res.status).toBe(401);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("400s malformed bodies", async () => {
    const res = await POST(postRequest({ token: 123 }));
    expect(res.status).toBe(400);
  });

  it("409s when caller already belongs to a household", async () => {
    state.existingMember = { household_id: "hh-existing" };
    const res = await POST(postRequest({ token: TOKEN }));
    expect(res.status).toBe(409);
  });

  it("404s when invite is missing or not pending", async () => {
    state.invite = null;
    const res = await POST(postRequest({ token: TOKEN }));
    expect(res.status).toBe(404);
  });

  it("410s when invite is expired", async () => {
    state.invite = {
      ...INVITE,
      expires_at: new Date(Date.now() - 86_400_000).toISOString(),
    };
    const res = await POST(postRequest({ token: TOKEN }));
    expect(res.status).toBe(410);
  });

  it("403s when the accepting user has no email address", async () => {
    state.user = { id: "user-1" };
    const res = await POST(postRequest({ token: TOKEN }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "Your account has no email address.",
    });
  });

  it("403s when invite email does not match the user's email", async () => {
    state.user = { id: "user-1", email: "wrong@example.com" };
    const res = await POST(postRequest({ token: TOKEN }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "Invite was sent to a different email address.",
    });
  });

  it("is case-insensitive and ignores surrounding whitespace", async () => {
    state.invite = { ...INVITE, email: "  PARTNER@EXAMPLE.COM  " };
    state.user = { id: "user-1", email: "partner@example.com" };
    const res = await POST(postRequest({ token: TOKEN }));
    expect(res.status).toBe(200);
  });

  it("joins the household when everything matches", async () => {
    const res = await POST(postRequest({ token: TOKEN, displayName: "Alex" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.household_id).toBe("hh-1");

    expect(state.insertMemberCalls).toHaveLength(1);
    expect(state.insertMemberCalls[0]).toMatchObject({
      household_id: "hh-1",
      user_id: "user-1",
      role: "partner",
      display_name: "Alex",
    });

    expect(state.updateInviteCalls).toHaveLength(1);
    expect(state.updateInviteCalls[0]).toEqual({ id: "invite-1", status: "accepted" });
  });

  it("defaults display name to Partner B when not provided", async () => {
    const res = await POST(postRequest({ token: TOKEN }));
    expect(res.status).toBe(200);
    expect(state.insertMemberCalls[0].display_name).toBe("Partner B");
  });

  it("500s honestly when household_members insert fails", async () => {
    state.insertMemberError = { message: "db down" };
    const res = await POST(postRequest({ token: TOKEN }));
    expect(res.status).toBe(500);
    expect(state.updateInviteCalls).toHaveLength(0);
  });
});
