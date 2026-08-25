import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Route-handler integration test for POST /api/shares — proves the cross-tenant
 * share IDOR fix (AUDIT T1.1): a user requesting a share link for an assessment
 * they don't own gets 404, and never reaches the insert.
 *
 * Supabase server client + env are mocked so the handler runs in isolation.
 * This is the first route-integration test; it doubles as the seed harness for
 * the wider integration suite called for in T3.5.
 */

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  ownedAssessment: null as { id: string } | null,
  ownershipError: null as unknown,
  activeShareCount: 0,
  insertResult: { data: { share_token: "tok_123" }, error: null } as {
    data: { share_token: string } | null;
    error: unknown;
  },
  insertCalls: 0,
}));

vi.mock("@/lib/entitlements", async (importOriginal) => ({
  // Keep the real nextTierWithMore: the share-cap sentence only offers an upgrade
  // when a higher tier actually raises the cap, and stubbing that would let the
  // route claim an upgrade exists without the tier ladder ever being consulted.
  ...(await importOriginal<typeof import("@/lib/entitlements")>()),
  getUserEntitlements: async () => ({
    userId: state.user?.id ?? null,
    entitlements: { tier: "free" as const, maxActiveShares: 2 },
  }),
}));

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_SITE_URL: "https://homitechnology.com" },
}));

vi.mock("@/lib/supabase/server", () => {
  function from(table: string) {
    if (table === "assessments") {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data: state.ownedAssessment,
          error: state.ownershipError,
        }),
      };
      return builder;
    }
    // score_shares
    const builder = {
      insert: () => {
        state.insertCalls += 1;
        return builder;
      },
      select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.head) {
          return {
            eq: () => ({
              is: () => ({
                gt: async () => ({ count: state.activeShareCount }),
              }),
            }),
          };
        }
        return builder;
      },
      eq: () => builder,
      is: () => builder,
      gt: () => builder,
      single: async () => state.insertResult,
    };
    return builder;
  }
  return {
    createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: state.user } }) },
      from,
    }),
  };
});

import { POST } from "@/app/api/shares/route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/shares", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  state.user = { id: "owner-1" };
  state.ownedAssessment = null;
  state.ownershipError = null;
  state.activeShareCount = 0;
  state.insertResult = { data: { share_token: "tok_123" }, error: null };
  state.insertCalls = 0;
});

describe("POST /api/shares", () => {
  it("401s an unauthenticated request", async () => {
    state.user = null;
    const res = await POST(req({ assessmentId: VALID_UUID }));
    expect(res.status).toBe(401);
    expect(state.insertCalls).toBe(0);
  });

  it("400s a missing / empty assessmentId", async () => {
    expect((await POST(req({}))).status).toBe(400);
    expect((await POST(req({ assessmentId: "" }))).status).toBe(400);
    expect(state.insertCalls).toBe(0);
  });

  it("treats a non-empty (non-UUID) assessmentId as valid, gating on ownership", async () => {
    // The §9 acceptance oracle uses non-UUID ids (e.g. "assess-1"); the route no
    // longer hard-rejects non-UUID ids. An unowned id resolves to 404, never inserts.
    state.ownedAssessment = null;
    const res = await POST(req({ assessmentId: "assess-1" }));
    expect(res.status).toBe(404);
    expect(state.insertCalls).toBe(0);
  });

  it("404s when the assessment is not owned by the caller (the IDOR fix)", async () => {
    state.ownedAssessment = null; // ownership select returns nothing
    const res = await POST(req({ assessmentId: VALID_UUID }));
    expect(res.status).toBe(404);
    // Critically: it never reached the score_shares insert.
    expect(state.insertCalls).toBe(0);
  });

  it("creates a share link when the caller owns the assessment", async () => {
    state.ownedAssessment = { id: VALID_UUID };
    const res = await POST(req({ assessmentId: VALID_UUID }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { url: string };
    expect(body.url).toBe("https://homitechnology.com/share/tok_123");
    expect(state.insertCalls).toBe(1);
  });

  it("402s when the active share limit is reached", async () => {
    state.ownedAssessment = { id: VALID_UUID };
    state.activeShareCount = 2;
    const res = await POST(req({ assessmentId: VALID_UUID }));
    expect(res.status).toBe(402);
    expect(state.insertCalls).toBe(0);
  });
});
