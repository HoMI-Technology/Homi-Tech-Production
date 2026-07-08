import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gateCompanion } from "@/lib/advisor/quota";

/**
 * Unit tests for the Companion gate (advisor/twin/trinity). Builds a minimal
 * fake Supabase client per case — the gate takes the client as an argument, so
 * no module mocking is needed.
 */

interface FakeOpts {
  user: { id: string } | null;
  tier?: string;
  rpc?: { data: unknown; error: { code?: string; message: string } | null };
}

function fakeSupabase(opts: FakeOpts): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: opts.user }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: opts.user ? { subscription_tier: opts.tier ?? "free" } : null,
            error: null,
          }),
        }),
      }),
    }),
    rpc: async () => opts.rpc ?? { data: true, error: null },
  } as unknown as SupabaseClient;
}

describe("gateCompanion", () => {
  it("401s an anonymous request (never spends on anonymous LLM calls)", async () => {
    const gate = await gateCompanion(fakeSupabase({ user: null }));
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.response.status).toBe(401);
  });

  it("allows a signed-in user under quota", async () => {
    const gate = await gateCompanion(
      fakeSupabase({ user: { id: "u1" }, tier: "free", rpc: { data: true, error: null } }),
    );
    expect(gate.ok).toBe(true);
  });

  it("402s a signed-in user over their daily quota (graceful upgrade nudge)", async () => {
    const gate = await gateCompanion(
      fakeSupabase({ user: { id: "u1" }, tier: "free", rpc: { data: false, error: null } }),
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.response.status).toBe(402);
      const body = (await gate.response.json()) as { code: string };
      expect(body.code).toBe("over_quota");
    }
  });

  it("FAILS OPEN when the usage infra isn't applied yet (migration 00013 pending)", async () => {
    for (const code of ["42883", "42P01", "PGRST202", "PGRST205"]) {
      const gate = await gateCompanion(
        fakeSupabase({
          user: { id: "u1" },
          rpc: { data: null, error: { code, message: "missing" } },
        }),
      );
      expect(gate.ok, `code ${code} should fail open`).toBe(true);
    }
  });

  it("fails closed with 503 on an unexpected DB error (protects spend)", async () => {
    const gate = await gateCompanion(
      fakeSupabase({
        user: { id: "u1" },
        rpc: { data: null, error: { code: "08006", message: "connection failure" } },
      }),
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.response.status).toBe(503);
  });
});
