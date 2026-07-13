import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Checkout requires an authenticated session (T1.2 billing hardening).
// Default mock: a signed-in user; individual tests can override to anonymous.
const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user_test_1" } } });
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ auth: { getUser: () => getUser() } }),
}));

import { POST } from "@/app/api/checkout/route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reports configured: false when STRIPE_SECRET_KEY is missing", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const res = await POST(request({ tier: "plus" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ configured: false });
  });

  it("returns 401 for anonymous users when Stripe is configured", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_PRICE_PLUS", "price_plus_123");
    getUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(request({ tier: "plus" }));
    expect(res.status).toBe(401);
  });

  it("rejects unknown tiers", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    const res = await POST(request({ tier: "platinum" }));
    expect(res.status).toBe(400);
  });

  it("500s with a clear error when the tier's price ID env var is missing", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_PRICE_PRO", "");
    const res = await POST(request({ tier: "pro" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("pro");
  });

  it.each(["plus", "pro", "family"] as const)(
    "returns a Stripe checkout URL for tier %s when fully configured",
    async (tier) => {
      vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
      vi.stubEnv("STRIPE_PRICE_PLUS", "price_plus_123");
      vi.stubEnv("STRIPE_PRICE_PRO", "price_pro_123");
      vi.stubEnv("STRIPE_PRICE_FAMILY", "price_family_123");

      const stripeFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ url: `https://checkout.stripe.com/c/pay/${tier}` }), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", stripeFetch);

      const res = await POST(request({ tier }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        configured: true,
        url: `https://checkout.stripe.com/c/pay/${tier}`,
      });

      const [url, init] = stripeFetch.mock.calls[0];
      expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
      const form = new URLSearchParams(String(init?.body));
      expect(form.get("line_items[0][price]")).toBe(`price_${tier}_123`);
      expect(form.get("mode")).toBe("subscription");
    },
  );

  it("returns 502 when Stripe rejects the request", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_PRICE_PLUS", "price_plus_123");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Invalid API Key", { status: 401 })),
    );
    const res = await POST(request({ tier: "plus" }));
    expect(res.status).toBe(502);
  });
});
