import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Route tests for GET/POST /api/plaid/link-token — proves the anonymous-user
 * bug is fixed (client_user_id was "anonymous"): anon gets 401, free tier
 * gets 402 (bankSync is a paid capability), and the token is created with the
 * real user id. {configured:false} is preserved when Plaid env is absent.
 */

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  tier: "free" as string,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data: state.user ? { subscription_tier: state.tier } : null,
        }),
      };
      return builder;
    },
  }),
}));

import { POST } from "@/app/api/plaid/link-token/route";

let requestCount = 0;

function req(): Request {
  requestCount += 1;
  return new Request("http://localhost/api/plaid/link-token", {
    method: "POST",
    // Distinct IP per request so the per-IP limiter never trips across tests.
    headers: { "x-forwarded-for": `10.1.0.${requestCount}` },
  });
}

beforeEach(() => {
  state.user = { id: "user-plus-1" };
  state.tier = "plus";
  vi.stubEnv("PLAID_CLIENT_ID", "client_test");
  vi.stubEnv("PLAID_SECRET", "secret_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/plaid/link-token", () => {
  it("reports configured:false (200) when Plaid env is absent", async () => {
    vi.stubEnv("PLAID_CLIENT_ID", "");
    vi.stubEnv("PLAID_SECRET", "");
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ configured: false });
  });

  it("401s an anonymous request (no more client_user_id 'anonymous')", async () => {
    state.user = null;
    const res = await POST(req());
    expect(res.status).toBe(401);
  });

  it("402s an authenticated free-tier user (bankSync is paid)", async () => {
    state.tier = "free";
    const res = await POST(req());
    expect(res.status).toBe(402);
  });

  it("creates a link token with the real user id for a plus user", async () => {
    const plaidFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ link_token: "link-sandbox-token-1" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", plaidFetch);

    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ configured: true, link_token: "link-sandbox-token-1" });

    const [url, init] = plaidFetch.mock.calls[0];
    expect(String(url)).toContain("/link/token/create");
    const body = JSON.parse(String(init?.body));
    expect(body.user.client_user_id).toBe("user-plus-1");
    expect(body.user.client_user_id).not.toBe("anonymous");
  });

  it("502s with a correlation id when Plaid rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad credentials", { status: 400 })),
    );
    const res = await POST(req());
    expect(res.status).toBe(502);
    const body = (await res.json()) as { correlationId?: string };
    expect(body.correlationId).toBeTruthy();
  });
});
