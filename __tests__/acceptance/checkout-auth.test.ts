import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * ACCEPTANCE — No anonymous checkout (BUILD-BRIEF §9, AUDIT H3)
 *
 * An unauthenticated POST /api/checkout must be rejected (401) and must NOT
 * create a Stripe session — otherwise money is taken with no user to provision
 * (client_reference_id is null and the webhook silently skips). Red today
 * (checkout treats auth as optional); green once auth is required.
 */

vi.mock("@/lib/env", () => ({
  hasStripe: () => true,
  env: {
    STRIPE_SECRET_KEY: "sk_test_x",
    NEXT_PUBLIC_SITE_URL: "https://homitechnology.com",
  },
}));

let currentUser: unknown = null;
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) },
  })),
}));

const fetchMock = vi.fn(
  async (..._args: unknown[]) =>
    new Response(JSON.stringify({ url: "https://checkout.stripe.com/x" }), { status: 200 }),
);

beforeEach(() => {
  currentUser = null;
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  process.env.STRIPE_PRICE_PRO = "price_test_pro";
});

async function callCheckout() {
  const { POST } = await import("@/app/api/checkout/route");
  const req = new Request("https://homitechnology.com/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tier: "pro" }),
  });
  return POST(req);
}

describe("POST /api/checkout — auth required", () => {
  it("rejects anonymous checkout with 401 and creates no Stripe session", async () => {
    currentUser = null;
    const res = await callCheckout();
    expect(res.status).toBe(401);
    const createdSession = fetchMock.mock.calls.some(([url]) =>
      String(url).includes("/v1/checkout/sessions"),
    );
    expect(createdSession).toBe(false);
  });

  it("allows an authenticated user to start checkout", async () => {
    currentUser = { id: "user-a" };
    const res = await callCheckout();
    expect(res.status).toBe(200);
  });
});
