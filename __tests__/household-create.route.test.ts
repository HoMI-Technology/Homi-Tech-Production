import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * POST /api/household — create household + join as owner.
 * Covers the first half of the production-slice journey.
 */

type MemberRow = { household_id: string } | null;

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  existingMember: null as MemberRow,
  insertHouseholdError: null as { message: string; code?: string } | null,
  insertMemberError: null as { message: string } | null,
  created: {
    id: "hh-1",
    name: "Our household",
    created_by: "user-1",
    created_at: "2026-08-12T00:00:00.000Z",
  },
  insertHouseholdCalls: [] as Record<string, unknown>[],
  insertMemberCalls: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === "household_members") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: state.existingMember,
                error: null,
              }),
            }),
          }),
          insert: (payload: Record<string, unknown>) => {
            state.insertMemberCalls.push(payload);
            return Promise.resolve({ error: state.insertMemberError });
          },
        };
      }
      if (table === "households") {
        return {
          insert: (payload: Record<string, unknown>) => {
            state.insertHouseholdCalls.push(payload);
            return {
              select: () => ({
                single: async () => ({
                  data: state.insertHouseholdError ? null : state.created,
                  error: state.insertHouseholdError,
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

vi.mock("@/lib/ratelimit", () => ({
  getClientIp: () => "203.0.113.7",
  rateLimit: async () => ({ allowed: true }),
}));

import { POST } from "@/app/api/household/route";

function postRequest(body: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/api/household", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  state.user = { id: "user-1" };
  state.existingMember = null;
  state.insertHouseholdError = null;
  state.insertMemberError = null;
  state.insertHouseholdCalls = [];
  state.insertMemberCalls = [];
});

describe("POST /api/household", () => {
  it("401s anonymous callers", async () => {
    state.user = null;
    const res = await POST(postRequest({ name: "Ours" }));
    expect(res.status).toBe(401);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("400s when the name is too long", async () => {
    const res = await POST(postRequest({ name: "x".repeat(81) }));
    expect(res.status).toBe(400);
  });

  it("409s when the caller already belongs to a household", async () => {
    state.existingMember = { household_id: "hh-existing" };
    const res = await POST(postRequest({ name: "Ours" }));
    expect(res.status).toBe(409);
  });

  it("creates the household and seats the caller as owner", async () => {
    const res = await POST(
      postRequest(
        { name: "Kim household", displayName: "Kim" },
        { "x-request-id": "req-create-1" },
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("req-create-1");
    const body = (await res.json()) as { ok: boolean; household: { id: string } };
    expect(body.ok).toBe(true);
    expect(body.household.id).toBe("hh-1");
    expect(state.insertHouseholdCalls[0]).toMatchObject({
      name: "Kim household",
      created_by: "user-1",
    });
    expect(state.insertMemberCalls[0]).toMatchObject({
      household_id: "hh-1",
      user_id: "user-1",
      role: "owner",
      display_name: "Kim",
    });
  });

  it("500s honestly when the owner seat insert fails", async () => {
    state.insertMemberError = { message: "db down" };
    const res = await POST(postRequest({ name: "Ours" }));
    expect(res.status).toBe(500);
  });
});
