import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomBytes } from "node:crypto";

/**
 * Route tests for GET/POST /api/plaid/link-token — proves the anonymous-user
 * bug is fixed (client_user_id was "anonymous"): anon gets 401, free tier
 * gets 402 (bankSync is a paid capability), and the token is created with the
 * real user id. {configured:false} is preserved when Plaid env is absent.
 * Update mode: POST {item_id} creates a token bound to the item's access
 * token (ownership enforced), with no products array.
 */

const KEY = randomBytes(32).toString("base64");
const RAW_TOKEN = "access-sandbox-99999999-8888-7777-6666-555555555555";
const ITEM_UUID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  tier: "free" as string,
  /** plaid_items row served to the ownership lookup (null = not found). */
  itemRow: null as Record<string, unknown> | null,
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

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "plaid_items") throw new Error(`unexpected admin table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.itemRow, error: null }),
            }),
          }),
        }),
      };
    },
  }),
}));

import { POST } from "@/app/api/plaid/link-token/route";
import { encryptToken } from "@/lib/plaid/crypto";

let requestCount = 0;

function req(body?: unknown): Request {
  requestCount += 1;
  return new Request("http://localhost/api/plaid/link-token", {
    method: "POST",
    // Distinct IP per request so the per-IP limiter never trips across tests.
    headers: { "x-forwarded-for": `10.1.0.${requestCount}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  state.user = { id: "user-plus-1" };
  state.tier = "plus";
  state.itemRow = null;
  vi.stubEnv("PLAID_CLIENT_ID", "client_test");
  vi.stubEnv("PLAID_SECRET", "secret_test");
  vi.stubEnv("PLAID_TOKEN_KEY", KEY);
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
    const plaidFetch = vi
      .fn()
      .mockResolvedValue(
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
    expect(body.webhook).toBe("https://homitechnology.com/api/plaid/webhook");
    expect(body.redirect_uri).toBeUndefined();
    expect(body.products).toEqual(["transactions"]);
    expect(body.required_if_supported_products).toEqual(["identity"]);
    expect(body.additional_consented_products).toEqual(["investments", "liabilities"]);
  });

  it("registers the deployment webhook and an allowlisted redirect URI when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://homi-platform-preview.vercel.app");
    vi.stubEnv("PLAID_REDIRECT_URI", "https://homitechnology.com/connections/oauth");
    const plaidFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ link_token: "link-sandbox-token-2" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", plaidFetch);

    const res = await POST(req());
    expect(res.status).toBe(200);

    const [, init] = plaidFetch.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.webhook).toBe("https://homi-platform-preview.vercel.app/api/plaid/webhook");
    expect(body.redirect_uri).toBe("https://homitechnology.com/connections/oauth");
  });

  it("creates an update-mode token bound to an OWNED item's access token (no products array)", async () => {
    state.itemRow = { id: ITEM_UUID, access_token_ct: encryptToken(RAW_TOKEN) };
    const plaidFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ link_token: "link-update-token-1" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", plaidFetch);

    const res = await POST(req({ item_id: ITEM_UUID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      configured: true,
      link_token: "link-update-token-1",
      update_mode: true,
    });

    const [, init] = plaidFetch.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.access_token).toBe(RAW_TOKEN);
    expect(body.products).toBeUndefined();
    expect(body.additional_consented_products).toEqual([
      "investments",
      "identity",
      "liabilities",
    ]);
    expect(body.user.client_user_id).toBe("user-plus-1");
    expect(body.webhook).toBe("https://homitechnology.com/api/plaid/webhook");
  });

  it("404s an update-mode request for an item the caller does not own", async () => {
    state.itemRow = null; // id+user_id filtered lookup found nothing
    const plaidFetch = vi.fn();
    vi.stubGlobal("fetch", plaidFetch);

    const res = await POST(req({ item_id: ITEM_UUID }));
    expect(res.status).toBe(404);
    expect(plaidFetch).not.toHaveBeenCalled();
  });

  it("400s a non-uuid item_id", async () => {
    const res = await POST(req({ item_id: "item-plaid-abc" }));
    expect(res.status).toBe(400);
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
