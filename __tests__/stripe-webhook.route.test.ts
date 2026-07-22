import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * UNIT — Stripe webhook route (SDK boundary mocked)
 *
 * Complements the §9 acceptance oracle (`__tests__/acceptance/stripe-webhook.test.ts`,
 * which exercises the REAL `stripe` SDK + real HMAC signatures). Here the SDK
 * boundary (`webhooks.constructEvent` + `checkout.sessions.listLineItems`) is
 * mocked so we can lock the exact HTTP contract at the seam:
 *   - signature verification failure -> 400 "Invalid signature."
 *     (missing header, tampered body, stale timestamp, missing secret)
 *   - verified-but-unparseable payload -> 400 "Invalid JSON payload."
 *   - insert-first idempotency -> replay acknowledged without reprocessing
 *   - transient failure -> >=500 AND the idempotency claim is RELEASED so the
 *     retry actually reprocesses (audit: retry-defeating idempotency)
 *   - checkout tier resolution fails CLOSED: a failed line-item round-trip
 *     retries; only a genuinely lookup_key-less price records without a tier
 *     (audit: fail-open tiering left paid users on free)
 */

const sdkMocks = vi.hoisted(() => {
  class FakeSignatureVerificationError extends Error {}
  return { constructEvent: vi.fn(), listLineItems: vi.fn(), FakeSignatureVerificationError };
});
const { constructEvent, listLineItems, FakeSignatureVerificationError } = sdkMocks;

vi.mock("stripe", () => ({
  default: Object.assign(
    vi.fn().mockImplementation(() => ({
      webhooks: { constructEvent: sdkMocks.constructEvent },
      checkout: { sessions: { listLineItems: sdkMocks.listLineItems } },
    })),
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
  paymentUpserts: [] as Array<Record<string, unknown>>,
  failProfileUpdate: false,
  failEventInsert: false,
}));

// Service client stub mirroring supabase semantics (errors RETURNED, not thrown).
// `webhook_events` insert enforces a UNIQUE(event_id); `delete` releases it so
// the route's transient-failure rollback can be exercised.
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from(table: string) {
      const builder: Record<string, unknown> = {};
      const then = () => builder;
      Object.assign(builder, {
        select: then,
        eq: then,
        limit: then,
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
        delete() {
          const chain: Record<string, unknown> = {};
          Object.assign(chain, {
            eq: (_column: string, value: unknown) => {
              if (table === "webhook_events") state.seenEventIds.delete(String(value));
              return chain;
            },
            then: (r: (v: unknown) => void) => r({ error: null }),
          });
          return chain;
        },
        upsert(row: Record<string, unknown>) {
          if (table === "payments") state.paymentUpserts.push(row);
          const chain: Record<string, unknown> = {};
          Object.assign(chain, {
            then: (r: (v: unknown) => void) => r({ data: [row], error: null }),
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
  data: {
    object: {
      id: "cs_test_1",
      client_reference_id: "user-a",
      customer: "cus_1",
      subscription: "sub_1",
      payment_intent: "pi_test_1",
      amount_total: 999,
      currency: "usd",
      payment_status: "paid",
    },
  },
};

beforeEach(() => {
  state.profileUpdates = [];
  state.profileWhere = [];
  state.seenEventIds = new Set();
  state.paymentUpserts = [];
  state.failProfileUpdate = false;
  state.failEventInsert = false;
  envState.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  envState.STRIPE_SECRET_KEY = "sk_test_x";
  envState.SUPABASE_SERVICE_ROLE_KEY = "service_role_test";
  constructEvent.mockReset();
  // Default: the checkout line-item round-trip succeeds with a mapped price.
  listLineItems.mockReset();
  listLineItems.mockResolvedValue({ data: [{ price: { lookup_key: "homi_plus_monthly" } }] });
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

  it("releases the idempotency claim on a transient profile-update failure so the retry reprocesses", async () => {
    state.failProfileUpdate = true;
    verified(checkoutEvent);
    const first = await POST(request("{}"));
    expect(first.status).toBe(500);
    expect(await first.json()).toEqual({ error: "Transient database error." });
    expect(state.profileUpdates).toHaveLength(0);

    // The claim was rolled back, so the redelivery is NOT acked as a duplicate.
    state.failProfileUpdate = false;
    const retry = await POST(request("{}"));
    expect(retry.status).toBe(200);
    expect(state.profileUpdates).toHaveLength(1);
    expect(state.profileUpdates[0].subscription_tier).toBe("plus");
  });

  it("checkout.session.completed provisions by user id with the round-trip lookup_key tier", async () => {
    listLineItems.mockResolvedValue({ data: [{ price: { lookup_key: "homi_pro_monthly" } }] });
    verified(checkoutEvent);
    const res = await POST(request("{}"));
    expect(res.status).toBe(200);
    expect(state.profileUpdates).toHaveLength(1);
    const patch = state.profileUpdates[0];
    expect(patch.subscription_status).toBe("active");
    expect(patch.stripe_customer_id).toBe("cus_1");
    expect(patch.subscription_tier).toBe("pro");
    expect(state.profileWhere).toContainEqual({ column: "id", value: "user-a" });
  });

  it("checkout.session.completed writes a succeeded row to the payments ledger", async () => {
    verified(checkoutEvent);
    const res = await POST(request("{}"));
    expect(res.status).toBe(200);
    expect(state.paymentUpserts).toHaveLength(1);
    expect(state.paymentUpserts[0]).toMatchObject({
      stripe_payment_intent_id: "pi_test_1",
      user_id: "user-a",
      amount: 999,
      currency: "usd",
      status: "succeeded",
    });
  });

  it("invoice.payment_succeeded writes a succeeded row to the payments ledger", async () => {
    verified({
      id: "evt_inv_ok_1",
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "in_1",
          customer: "cus_1",
          amount_paid: 1999,
          currency: "usd",
          payment_intent: "pi_inv_1",
          billing_reason: "subscription_cycle",
        },
      },
    });
    const res = await POST(request("{}"));
    expect(res.status).toBe(200);
    expect(state.paymentUpserts).toHaveLength(1);
    expect(state.paymentUpserts[0]).toMatchObject({
      stripe_payment_intent_id: "pi_inv_1",
      amount: 1999,
      status: "succeeded",
    });
  });

  it("skips ledger write when checkout amount_total is 0", async () => {
    verified({
      id: "evt_checkout_free",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_free",
          client_reference_id: "user-a",
          customer: "cus_1",
          payment_intent: "pi_free",
          amount_total: 0,
          currency: "usd",
          payment_status: "paid",
        },
      },
    });
    const res = await POST(request("{}"));
    expect(res.status).toBe(200);
    expect(state.paymentUpserts).toHaveLength(0);
  });

  it("fails CLOSED (500) and releases the claim when the line-item round-trip fails", async () => {
    listLineItems.mockRejectedValue(new Error("stripe api timeout"));
    verified(checkoutEvent);
    const first = await POST(request("{}"));
    expect(first.status).toBe(500);
    expect(state.profileUpdates).toHaveLength(0);

    // A retry once Stripe is reachable resolves the tier — not lost to a silent 200.
    listLineItems.mockResolvedValue({ data: [{ price: { lookup_key: "homi_plus_monthly" } }] });
    const retry = await POST(request("{}"));
    expect(retry.status).toBe(200);
    expect(state.profileUpdates).toHaveLength(1);
    expect(state.profileUpdates[0].subscription_tier).toBe("plus");
  });

  it("records the customer WITHOUT a tier (200) when the price carries no lookup_key", async () => {
    // A missing lookup_key is a Stripe misconfiguration a retry cannot fix, so
    // it is recorded (not retried) — distinct from a failed round-trip.
    listLineItems.mockResolvedValue({ data: [{ price: { lookup_key: null } }] });
    verified(checkoutEvent);
    const res = await POST(request("{}"));
    expect(res.status).toBe(200);
    expect(state.profileUpdates).toHaveLength(1);
    expect(state.profileUpdates[0].subscription_status).toBe("active");
    expect(state.profileUpdates[0].subscription_tier).toBeUndefined();
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
