#!/usr/bin/env node
/**
 * HōMI Stripe webhook verification
 * ================================
 *
 * The billing state machine only works if Stripe actually delivers the four
 * events app/api/webhooks/stripe/route.ts knows how to handle. A missing
 * subscription is silent: nothing errors, the account simply never changes
 * tier. `customer.subscription.deleted` is the dangerous one to omit — a
 * cancellation then never downgrades, and the user keeps paid access for free.
 *
 * Read-only — it never creates or modifies a webhook endpoint.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/verify-stripe-webhook.mjs
 *
 * Exits non-zero if the endpoint is missing, disabled, or under-subscribed.
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("[verify-stripe-webhook] Missing STRIPE_SECRET_KEY.");
  process.exit(1);
}

/** Must stay in step with the switch in app/api/webhooks/stripe/route.ts. */
const REQUIRED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
];

const EXPECTED_URL = "https://homitechnology.com/api/webhooks/stripe";

async function listEndpoints() {
  const res = await fetch("https://api.stripe.com/v1/webhook_endpoints?limit=100", {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe GET /webhook_endpoints failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body.data ?? [];
}

async function main() {
  const mode = STRIPE_SECRET_KEY.startsWith("sk_live_") ? "LIVE" : "test";
  const endpoints = await listEndpoints();

  console.log(`[verify-stripe-webhook] mode: ${mode}  endpoints found: ${endpoints.length}\n`);

  if (endpoints.length === 0) {
    console.error("  No webhook endpoints exist at all. Billing will never update a tier.");
    console.error(`  Create one: Developers -> Webhooks -> Add endpoint -> ${EXPECTED_URL}`);
    process.exit(1);
  }

  for (const ep of endpoints) {
    const isTarget = ep.url === EXPECTED_URL;
    console.log(`  ${isTarget ? "->" : "  "} ${ep.url}`);
    console.log(`       status=${ep.status}  events=${ep.enabled_events.length}  ${ep.id}`);
  }
  console.log("");

  const target = endpoints.find((ep) => ep.url === EXPECTED_URL);
  if (!target) {
    console.error(`  FAIL  no endpoint points at ${EXPECTED_URL}`);
    console.error("  The endpoints above exist but none is the production route.");
    process.exit(1);
  }

  let failures = 0;

  if (target.status !== "enabled") {
    console.error(`  FAIL  endpoint status is "${target.status}", not "enabled"`);
    failures++;
  }

  // Stripe allows a wildcard subscription, which covers everything we need.
  const wildcard = target.enabled_events.includes("*");
  const missing = wildcard ? [] : REQUIRED_EVENTS.filter((e) => !target.enabled_events.includes(e));

  if (wildcard) {
    console.log('  ok    subscribed to "*" (all events) — covers all four required');
  } else {
    for (const ev of REQUIRED_EVENTS) {
      const present = target.enabled_events.includes(ev);
      console.log(`  ${present ? "ok  " : "FAIL"}  ${ev}`);
    }
    failures += missing.length;

    // Extra subscriptions are harmless (the route ignores what it doesn't
    // handle) but worth surfacing — they usually mean a stale copy-paste.
    const extra = target.enabled_events.filter((e) => !REQUIRED_EVENTS.includes(e));
    if (extra.length) {
      console.log(`\n  note  ${extra.length} extra event(s) subscribed, ignored by the route:`);
      extra.forEach((e) => console.log(`          ${e}`));
    }
  }

  console.log("");
  if (failures) {
    console.error(`[verify-stripe-webhook] ${failures} problem(s).`);
    if (missing.includes("customer.subscription.deleted")) {
      console.error("  customer.subscription.deleted is missing — cancellations will NOT downgrade.");
    }
    process.exit(1);
  }
  console.log("[verify-stripe-webhook] Endpoint is enabled and subscribes to all four handled events.");
}

main().catch((err) => {
  console.error("[verify-stripe-webhook] failed:", err.message ?? err);
  process.exit(1);
});
