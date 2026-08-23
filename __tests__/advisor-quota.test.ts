import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEntitlements } from "@/lib/entitlements";
import { gateCompanion } from "@/lib/advisor/quota";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Advisor quota gate: prefers the monthly-aware v2 RPC, falls back to the
 * daily-only v1 when v2 isn't applied yet, and maps consume=false to a 402
 * upgrade nudge. Also locks the monthly ceiling into the entitlement matrix.
 */

describe("entitlements monthly ceiling", () => {
  it("every tier has a monthly cap >= its daily cap", () => {
    for (const tier of ["free", "plus", "pro", "family"] as const) {
      const e = getEntitlements(tier);
      expect(e.advisorMessagesPerMonth).toBeGreaterThanOrEqual(e.advisorMessagesPerDay);
    }
  });

  it("free stays a genuine taste, paid tiers scale", () => {
    expect(getEntitlements("free").advisorMessagesPerMonth).toBe(60);
    expect(getEntitlements("plus").advisorMessagesPerMonth).toBeGreaterThan(
      getEntitlements("free").advisorMessagesPerMonth,
    );
  });
});

interface RpcScript {
  [fn: string]: () => { data: unknown; error: { code: string; message: string } | null };
}

function client(
  rpc: RpcScript,
  userId: string | null = "u1",
  usage: Array<{ day: string; count: number }> = [],
): SupabaseClient {
  const calls: string[] = [];
  const c = {
    __calls: calls,
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { subscription_tier: "plus" } }) }),
        gte: async () => ({ data: usage, error: null }),
      }),
    }),
    rpc: async (fn: string) => {
      calls.push(fn);
      return rpc[fn] ? rpc[fn]() : { data: null, error: { code: "42883", message: "missing" } };
    },
  } as unknown as SupabaseClient;
  return c;
}

beforeEach(() => vi.restoreAllMocks());

describe("gateCompanion", () => {
  it("401s an anonymous caller", async () => {
    const gate = await gateCompanion(client({}, null));
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.response.status).toBe(401);
  });

  it("consumes via v2 when present", async () => {
    const c = client({ try_consume_advisor_message_v2: () => ({ data: true, error: null }) });
    const gate = await gateCompanion(c);
    expect(gate.ok).toBe(true);
    expect((c as unknown as { __calls: string[] }).__calls).toContain(
      "try_consume_advisor_message_v2",
    );
  });

  it("falls back to v1 when v2 is not applied", async () => {
    const c = client({
      try_consume_advisor_message_v2: () => ({
        data: null,
        error: { code: "PGRST202", message: "no fn" },
      }),
      try_consume_advisor_message: () => ({ data: true, error: null }),
    });
    const gate = await gateCompanion(c);
    expect(gate.ok).toBe(true);
    const calls = (c as unknown as { __calls: string[] }).__calls;
    expect(calls).toContain("try_consume_advisor_message_v2");
    expect(calls).toContain("try_consume_advisor_message");
  });

  it("returns 402 when over quota", async () => {
    const c = client({ try_consume_advisor_message_v2: () => ({ data: false, error: null }) });
    const gate = await gateCompanion(c);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.response.status).toBe(402);
  });

  it("fails open when NEITHER RPC is applied (mid-migration safety)", async () => {
    const c = client({
      try_consume_advisor_message_v2: () => ({
        data: null,
        error: { code: "42883", message: "no v2" },
      }),
      try_consume_advisor_message: () => ({
        data: null,
        error: { code: "42883", message: "no v1" },
      }),
    });
    const gate = await gateCompanion(c);
    expect(gate.ok).toBe(true);
  });
});
