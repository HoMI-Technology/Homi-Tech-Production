import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * POST /api/household/invite — owner-only, Family-gated, seat-capped.
 * This is the authz boundary of the production-slice journey.
 */

type Membership = { household_id: string; role: string } | null;

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  membership: null as Membership,
  householdMode: true,
  familySeats: 5,
  memberCount: 1,
  pendingCount: 0,
  insertError: null as { message: string } | null,
  insertCalls: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: async () => ({
    userId: state.user?.id ?? null,
    entitlements: {
      householdMode: state.householdMode,
      familySeats: state.familySeats,
    },
  }),
}));

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_SITE_URL: "https://homitechnology.com" },
}));

vi.mock("@/lib/ratelimit", () => ({
  getClientIp: () => "203.0.113.7",
  rateLimit: async () => ({ allowed: true }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === "household_members") {
        return {
          select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                eq: async () => ({ count: state.memberCount }),
              };
            }
            return {
              eq: () => ({
                maybeSingle: async () => ({
                  data: state.membership,
                  error: null,
                }),
              }),
            };
          },
        };
      }
      if (table === "household_invites") {
        return {
          select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                eq: () => ({
                  eq: async () => ({ count: state.pendingCount }),
                }),
              };
            }
            return {};
          },
          insert: (payload: Record<string, unknown>) => {
            state.insertCalls.push(payload);
            return {
              select: () => ({
                single: async () => ({
                  data: state.insertError
                    ? null
                    : {
                        id: "invite-1",
                        email: payload.email,
                        token: payload.token,
                        expires_at: "2026-08-19T00:00:00.000Z",
                        status: "pending",
                      },
                  error: state.insertError,
                }),
              }),
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { POST } from "@/app/api/household/invite/route";

function postRequest(body: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/api/household/invite", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  state.user = { id: "owner-1" };
  state.membership = { household_id: "hh-1", role: "owner" };
  state.householdMode = true;
  state.familySeats = 5;
  state.memberCount = 1;
  state.pendingCount = 0;
  state.insertError = null;
  state.insertCalls = [];
});

describe("POST /api/household/invite", () => {
  it("401s anonymous callers", async () => {
    state.user = null;
    const res = await POST(postRequest({ email: "p@example.com" }));
    expect(res.status).toBe(401);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("400s without a valid email", async () => {
    const res = await POST(postRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("403s when the caller is not the household owner", async () => {
    state.membership = { household_id: "hh-1", role: "partner" };
    const res = await POST(postRequest({ email: "p@example.com" }));
    expect(res.status).toBe(403);
  });

  it("402s when the plan has no householdMode", async () => {
    state.householdMode = false;
    const res = await POST(postRequest({ email: "p@example.com" }));
    expect(res.status).toBe(402);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("household_locked");
    expect(state.insertCalls).toHaveLength(0);
  });

  it("402s when seats (members + pending) are full", async () => {
    state.familySeats = 2;
    state.memberCount = 1;
    state.pendingCount = 1;
    const res = await POST(postRequest({ email: "p@example.com" }));
    expect(res.status).toBe(402);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("family_seats_full");
    expect(state.insertCalls).toHaveLength(0);
  });

  it("creates an invite for the owner on Family", async () => {
    const res = await POST(
      postRequest(
        { email: "Partner@Example.com", sendEmail: false },
        { "x-request-id": "req-invite-1" },
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("req-invite-1");
    const body = (await res.json()) as {
      ok: boolean;
      invite: { email: string; acceptPath: string };
    };
    expect(body.ok).toBe(true);
    expect(body.invite.email).toBe("partner@example.com");
    expect(body.invite.acceptPath).toMatch(/^\/household\?invite=/);
    expect(state.insertCalls[0]).toMatchObject({
      household_id: "hh-1",
      invited_by: "owner-1",
      email: "partner@example.com",
      status: "pending",
    });
    expect(String(state.insertCalls[0]?.token).length).toBeGreaterThan(20);
  });
});
