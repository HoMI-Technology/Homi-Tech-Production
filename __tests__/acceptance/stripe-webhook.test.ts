import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

/**
 * ACCEPTANCE — Stripe webhook correctness (BUILD-BRIEF §9, AUDIT H2/H4)
 *
 * Locks four behaviours the current handler gets wrong:
 *  1. invalid signature -> 400 (already correct; regression lock)
 *  2. a transient DB failure -> HTTP >=500 so Stripe RETRIES
 *     (today it swallows the error and returns 200 => paid, unprovisioned user)
 *  3. idempotency: the same event id delivered twice provisions ONCE
 *     (expects the brief's insert-first dedupe against webhook_events(event_id UNIQUE))
 *  4. customer.subscription.updated propagates a tier/status change
 *     (today it is ignored, so downgrades/past_due never apply)
 */

const WEBHOOK_SECRET = "whsec_test_secret";

const state = {
  profileUpdates: [] as Array<Record<string, unknown>>,
  seenEventIds: new Set<string>(),
  failProfileUpdate: false,
};

vi.mock("@/lib/env", () => ({
  env: {
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: "service_role_test",
    NEXT_PUBLIC_SUPABASE_URL: "https://giyycykxkzfbowiapxpd.supabase.co",
    STRIPE_SECRET_KEY: "sk_test_x",
  },
}));

// Service client stub: records profile updates; simulates a UNIQUE constraint
// on webhook_events(event_id) so insert-first dedupe works.
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
          // returns a thenable resolved after .eq(); model supabase semantics:
          // errors are RETURNED, not thrown.
          const result = state.failProfileUpdate
            ? { data: null, error: { message: "db unavailable", code: "57P01" } }
            : (state.profileUpdates.push(obj), { data: [obj], error: null });
          const chain: Record<string, unknown> = {};
          Object.assign(chain, {
            eq: () => chain,
            then: (r: (v: unknown) => void) => r(result),
          });
          return chain;
        },
        insert(row: Record<string, unknown>) {
          let error: unknown = null;
          if (table === "webhook_events") {
            const id = String(row.event_id ?? row.id ?? "");
            if (state.seenEventIds.has(id)) error = { code: "23505", message: "duplicate key" };
            else state.seenEventIds.add(id);
          }
          const chain: Record<string, unknown> = {};
          Object.assign(chain, {
            select: () => chain,
            single: async () => ({ data: error ? null : row, error }),
            maybeSingle: async () => ({ data: error ? null : row, error }),
            then: (r: (v: unknown) => void) => r({ data: error ? null : [row], error }),
          });
          return chain;
        },
      });
      return builder;
    },
  }),
}));

const priceLineItems = {
  data: [{ price: { lookup_key: "homi_pro_monthly", unit_amount: 2499 } }],
};
beforeEach(() => {
  state.profileUpdates = [];
  state.seenEventIds = new Set();
  state.failProfileUpdate = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(priceLineItems), { status: 200 })),
  );
});

function sign(body: string): string {
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", WEBHOOK_SECRET).update(`${t}.${body}`, "utf8").digest("hex");
  return `t=${t},v1=${sig}`;
}

async function deliver(event: unknown, opts: { badSig?: boolean } = {}) {
  const { POST } = await import("@/app/api/webhooks/stripe/route");
  const body = JSON.stringify(event);
  const req = new Request("https://homitechnology.com/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": opts.badSig ? "t=1,v1=deadbeef" : sign(body) },
    body,
  });
  return POST(req);
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
    },
  },
};

describe("POST /api/webhooks/stripe", () => {
  it("rejects an invalid signature with 400", async () => {
    const res = await deliver(checkoutEvent, { badSig: true });
    expect(res.status).toBe(400);
  });

  it("returns >=500 on a transient DB failure so Stripe retries", async () => {
    state.failProfileUpdate = true;
    const res = await deliver(checkoutEvent);
    expect(res.status).toBeGreaterThanOrEqual(500);
  });

  it("is idempotent: same event id twice provisions once", async () => {
    await deliver(checkoutEvent);
    await deliver(checkoutEvent);
    expect(state.profileUpdates.length).toBe(1);
  });

  it("handles customer.subscription.updated (propagates a change)", async () => {
    const res = await deliver({
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
    expect(res.status).toBeLessThan(300);
    expect(state.profileUpdates.length).toBeGreaterThanOrEqual(1);
  });
});
