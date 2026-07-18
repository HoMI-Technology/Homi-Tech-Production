import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * UNIT — Stripe webhook route (SDK boundary mocked)
 *
 * Complements the §9 acceptance oracle (`__tests__/acceptance/stripe-webhook.test.ts`,
 * which exercises the REAL `stripe` SDK + real HMAC signatures). Here the SDK
 * boundary (`webhooks.constructEvent`) is mocked so we can lock the exact
 * HTTP contract at the seam:
 *   - signature verification failure -> 400 "Invalid signature."
 *     (missing header, tampered body, stale timestamp, missing secret)
 *   - verified-but-unparseable payload -> 400 "Invalid JSON payload."
 *   - insert-first idempotency -> replay acknowledged without reprocessing
 *   - transient DB failure -> >=500 so Stripe retries
 *   - per-event handler mapping, lookup_key-only tier resolution
 */

const sdkMocks = vi.hoisted(() => {
  class FakeSignatureVerificationError extends Error {}
  return { constructEvent: vi.fn(), FakeSignatureVerificationError };
});
const { constructEvent, FakeSignatureVerificationError } = sdkMocks;

vi.mock("stripe", () => ({
  default: Object.assign(
    vi.fn().mockImplementation(() => ({ webhooks: { constructEvent: sdkMocks.constructEvent } })),
    {
      createFetchHttpClient: vi.fn(),
      errors: { StripeSignatureVerificationError: sdkMocks.FakeSignatureVerificationError },
    },
  ),
}));

const envState = vi.hoisted(() => ({
  STRIPE_WEBHOOK_SECRET: "whsec_test_secret" as string | undefined,
  STRIPE_SECRET_KEY: "sk_test_x" as string | undefined,
  SUPABASE_SERVICE_ROLE_KEY: "service_role_test" as string | undefined,
  NEXT_PUBLIC_SUPABASE_URL: "https://giyycykxkzfbowiapxpd.supabase.co",
}));
vi.mock("@/lib/env", () => ({ env: envState }));

const state = vi.hoisted(() => ({
  profileUpdates: [] as Array<Record<string, unknown>>,
  profileWhere: [] as Array<{ column: string; value: unknown }>,
  seenEventIds: new Set<string>(),
  failProfileUpdate: false,
  failEventInsert: false,
}));

// Service client stub mirroring supabase semantics (errors RETURNED, not thrown).
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from(table: string) {
      const builder: Record<string, unknown> = {};
      const then = () => builder;
      Object.assign(builder, {
        select: then,
        eq: then,
        maybeSingle: async () => ({ data: null, error: null }),
        update(obj: Record<string, unknown>) {
          const result = state.failProfileUpdate
            ? { data: null, error: { message: "db unavailable", code: "57P01" } }
            : (state.profileUpdates.push(obj), { data: [obj], error: null });
          const chain: Record<string, unknown> = {};
          Object.assign(chain, {
            eq: (column: string, value: unknown) => {
              state.profileWhere.push({ column, value });
              return chain;
            },
            then: (r: (v: unknown) => void) => r(result),
          });
          return chain;
        },
        insert(row: Record<string, unknown>) {
          let error: unknown = null;
          if (table === "webhook_events") {
            if (state.failEventInsert) {
              error = { code: "57P01", message: "db unavailable" };
            } else {
              const id = String(row.event_id ?? "");
              if (state.seenEventIds.has(id)) error = { code: "23505", message: "duplicate key" };
              else state.seenEventIds.add(id);
            }
          }
          const chain: Record<string, unknown> = {};
          Object.assign(chain, {
            then: (r: (v: unknown) => void) => r({ data: error ? null : [row], error }),
          });
          return chain;
        },
      });
      return builder;
    },
  }),
}));

import { POST } from "@/app/api/webhooks/stripe/route";

function request(body: string, opts: { signature?: string | null } = {}): Request {
  const headers = new Headers();
  const sig = opts.signature === undefined ? "t=1,v1=stubbed" : opts.signature;
  if (sig !== null) headers.set("stripe-signature", sig);
  return new Request("https://homitechnology.com/api/webhooks/stripe", {
    method: "POST",
    headers,
    body,
  });
}

function verified(event: unknown) {
  constructEvent.mockImplementation(() => event);
}

const checkoutEvent = {
  id: "evt_checkout_1",
  type: "checkout.session.completed",
  data: { object: { id: "cs_test_1", client_reference_id: "user-a", customer: "cus_1", subscription: "sub_1" } },
};

beforeEach(() => {
  state.profileUpdates = [];
  state.profileWhere = [];
  state.seenEventIds = new Set();
  state.failProfileUpdate = false;
  state.failEventInsert = false;
  envState.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  envState.STRIPE_SECRET_KEY = "sk_test_x";
  envState.SUPABASE_SERVICE_ROLE_KEY = "service_role_test";
  constructEvent.mockReset();
});

describe("POST /api/webhooks/stripe — signature failures -> 400", () => {
  it("rejects a missing stripe-signature header", async () => {
    const res = await POST(request("{}", { signature: null }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid signature." });
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it("rejects when STRIPE_WEBHOOK_SECRET is not configured", async () => {
    envState.STRIPE_WEBHOOK_SECRET = undefined;
    const res = await POST(request("{}"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid signature." });
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it("rejects a signature computed over a tampered body", async () => {
    constructEvent.mockImplementation(() => {
      throw new FakeSignatureVerificationError("No signatures found matching the expected signature for payload");
    });
    const res = await POST(request(JSON.stringify(checkoutEvent)));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid signature." });
  });

  it("rejects a stale timestamp (outside tolerance)", async () => {
    constructEvent.mockImplementation(() => {
      throw new FakeSignatureVerificationError("Timestamp outside the tolerance zone");
    });
    const res = await POST(request(JSON.stringify(checkoutEvent)));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid signature." });
  });

  it("rejects a verified-but-unparseable payload as invalid JSON", async () => {
    constructEvent.mockImplementation(() => {
      throw new SyntaxError("Unexpected token < in JSON");
    });
    const res = await POST(request("not-json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON payload." });
  });
});

describe("POST /api/webhooks/stripe — processing contract", () => {
  it("acknowledges an unhandled event type without touching profiles", async () => {
    verified({ id: "evt_unknown_1", type: "payment_intent.succeeded", data: { object: {} } });
    const res = await POST(request("{}"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(state.profileUpdates).toHaveLength(0);
  });

  it("is idempotent: a replayed event id returns duplicate without reprocessing", async () => {
    verified(checkoutEvent);
    const first = await POST(request("{}"));
    const second = await POST(request("{}"));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ received: true, duplicate: true });
    expect(state.profileUpdates).toHaveLength(1);
  });

  it("returns 500 when the webhook_events insert itself fails transiently", async () => {
    state.failEventInsert = true;
    verified(checkoutEvent);
    const res = await POST(request("{}"));
    expect(res.status).toBe(500);
  });

  it("returns 500 on a transient profile-update failure so Stripe retries", async () => {
    state.failProfileUpdate = true;
    verified(checkoutEvent);
    const res = await POST(request("{}"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Transient database error." });
  });

  it("checkout.session.completed provisions by user id with lookup_key tier", async () => {
    verified(checkoutEvent);
    // The tier round-trip goes through the SDK; with the module mocked it
    // rejects, so no tier is set — the lookup_key-only contract means NO
    // hardcoded-cents fallback fills one in.
    const res = await POST(request("{}"));
    expect(res.status).toBe(200);
    expect(state.profileUpdates).toHaveLength(1);
    const patch = state.profileUpdates[0];
    expect(patch.subscription_status).toBe("active");
    expect(patch.stripe_customer_id).toBe("cus_1");
    expect(patch.subscription_tier).toBeUndefined();
    expect(state.profileWhere).toContainEqual({ column: "id", value: "user-a" });
  });

  it("customer.subscription.updated maps inline lookup_key price + past_due status", async () => {
    verified({
      id: "evt_sub_upd_1",
      type: "customer.subscription.updated",
      data: {
        object: {
          customer: "cus_1",
          status: "past_due",
          items: { data: [{ price: { lookup_key: "homi_plus_monthly", unit_amount: 999 } }] },
        },
      },
    });
    const res = await POST(request("{}"));
    expect(res.status).toBe(200);
    expect(state.profileUpdates).toEqual([
      { subscription_status: "past_due", subscription_tier: "plus" },
    ]);
    expect(state.profileWhere).toContainEqual({ column: "stripe_customer_id", value: "cus_1" });
  });

  it("customer.subscription.updated does NOT derive tier from unit_amount", async () => {
    verified({
      id: "evt_sub_upd_2",
      type: "customer.subscription.updated",
      data: {
        object: {
          customer: "cus_1",
          status: "active",
          // 999 cents exists in the payload but lookup_key is absent —
          // there must be no cents-based fallback.
          items: { data: [{ price: { unit_amount: 999 } }] },
        },
      },
    });
    const res = await POST(request("{}"));
    expect(res.status).toBe(200);
    expect(state.profileUpdates).toEqual([{ subscription_status: "active" }]);
  });

  it("customer.subscription.deleted resets to free/cancelled", async () => {
    verified({
      id: "evt_sub_del_1",
      type: "customer.subscription.deleted",
      data: { object: { customer: "cus_1" } },
    });
    const res = await POST(request("{}"));
    expect(res.status).toBe(200);
    expect(state.profileUpdates).toEqual([
      { subscription_tier: "free", subscription_status: "cancelled" },
    ]);
  });

  it("invoice.payment_failed marks the customer past_due", async () => {
    verified({
      id: "evt_inv_fail_1",
      type: "invoice.payment_failed",
      data: { object: { customer: "cus_1" } },
    });
    const res = await POST(request("{}"));
    expect(res.status).toBe(200);
    expect(state.profileUpdates).toEqual([{ subscription_status: "past_due" }]);
  });

  it("skips checkout sessions without client_reference_id", async () => {
    verified({
      id: "evt_checkout_anon",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_2", customer: "cus_2" } },
    });
    const res = await POST(request("{}"));
    expect(res.status).toBe(200);
    expect(state.profileUpdates).toHaveLength(0);
  });

  it("returns 500 when the service role key is missing so Stripe retries", async () => {
    envState.SUPABASE_SERVICE_ROLE_KEY = undefined;
    verified(checkoutEvent);
    const res = await POST(request("{}"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Server misconfigured; webhook will retry.",
    });
    expect(state.profileUpdates).toHaveLength(0);
  });
});
