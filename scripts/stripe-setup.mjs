#!/usr/bin/env node
/**
 * HōMI Stripe setup (deploy handoff, T3)
 * =======================================
 *
 * Idempotent: ensures the 3 HōMI subscription products + recurring monthly
 * prices exist in the target Stripe account (test OR live — whichever
 * STRIPE_SECRET_KEY belongs to), then prints what to configure by hand
 * (webhook endpoint + env vars). It never touches the webhook endpoint or
 * env vars itself — those are deliberate manual/dashboard steps.
 *
 * Uses plain `fetch` against api.stripe.com — NO `stripe` npm SDK, matching
 * the hand-rolled webhook verifier in app/api/webhooks/stripe/route.ts.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs
 *   (or: npm run stripe-setup)
 *
 * NEVER run this against a live secret key without confirming with the
 * account owner first — it creates real Stripe objects.
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error(
    "[stripe-setup] Missing STRIPE_SECRET_KEY.\n" +
      "  Set it before running, e.g.:\n" +
      "    STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs\n" +
      "  Get a key from https://dashboard.stripe.com/apikeys (use a *test* key first).",
  );
  process.exit(1);
}

const API_BASE = "https://api.stripe.com/v1";
const WEBHOOK_URL = "https://homitechnology.com/api/webhooks/stripe";
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
];

/** HōMI tiers — must match lib/stripe/tiers.ts exactly (lookup_key, price). */
const TIER_DEFS = [
  { name: "HōMI Plus", lookupKey: "homi_plus_monthly", unitAmountCents: 999, priceEnvVar: "STRIPE_PRICE_PLUS" },
  { name: "HōMI Pro", lookupKey: "homi_pro_monthly", unitAmountCents: 2499, priceEnvVar: "STRIPE_PRICE_PRO" },
  { name: "HōMI Family", lookupKey: "homi_family_monthly", unitAmountCents: 3999, priceEnvVar: "STRIPE_PRICE_FAMILY" },
];

async function stripeGet(path, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}${path}${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe GET ${path} failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function stripePost(path, form) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form).toString(),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe POST ${path} failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

/** Finds an existing product by exact name, or creates one. */
async function ensureProduct(name) {
  const list = await stripeGet("/products", { limit: "100" });
  const existing = (list.data ?? []).find((p) => p.name === name && p.active);
  if (existing) {
    console.log(`  found product "${name}" -> ${existing.id}`);
    return existing;
  }
  const created = await stripePost("/products", { name });
  console.log(`  created product "${name}" -> ${created.id}`);
  return created;
}

/** Finds an existing recurring monthly price by lookup_key, or creates one. */
async function ensurePrice(def, productId) {
  const search = await stripeGet("/prices", { "lookup_keys[]": def.lookupKey, active: "true" });
  const existing = (search.data ?? []).find((p) => p.lookup_key === def.lookupKey);
  if (existing) {
    console.log(`  found price "${def.lookupKey}" -> ${existing.id}`);
    return existing;
  }
  const created = await stripePost("/prices", {
    product: productId,
    currency: "usd",
    unit_amount: String(def.unitAmountCents),
    "recurring[interval]": "month",
    lookup_key: def.lookupKey,
  });
  console.log(`  created price "${def.lookupKey}" -> ${created.id} ($${(def.unitAmountCents / 100).toFixed(2)}/mo)`);
  return created;
}

async function main() {
  console.log("[stripe-setup] Ensuring HōMI products + prices exist (idempotent)...\n");

  const results = [];
  for (const def of TIER_DEFS) {
    console.log(`${def.name}:`);
    const product = await ensureProduct(def.name);
    const price = await ensurePrice(def, product.id);
    results.push({ ...def, productId: product.id, priceId: price.id });
    console.log("");
  }

  console.log("=".repeat(78));
  console.log("Summary — product/price IDs:");
  for (const r of results) {
    console.log(`  ${r.name.padEnd(14)} product=${r.productId}  price=${r.priceId}  lookup_key=${r.lookupKey}`);
  }

  console.log("\nWebhook endpoint to register in the Stripe Dashboard");
  console.log("(Developers -> Webhooks -> Add endpoint):");
  console.log(`  URL:    ${WEBHOOK_URL}`);
  console.log(`  Events: ${WEBHOOK_EVENTS.join(", ")}`);
  console.log("  After creating it, copy the \"Signing secret\" (whsec_...) into STRIPE_WEBHOOK_SECRET.");

  console.log("\nEnv vars to set (Vercel Production + Preview, and .env.local for dev):");
  console.log("  STRIPE_SECRET_KEY        (already used to run this script)");
  console.log("  STRIPE_WEBHOOK_SECRET    (from the webhook endpoint above)");
  for (const r of results) {
    console.log(`  ${r.priceEnvVar.padEnd(24)} = ${r.priceId}`);
  }
  console.log("\n[stripe-setup] Done. This script created/verified Stripe objects only —");
  console.log("it did NOT set any env vars or register the webhook endpoint; do those by hand.");
}

main().catch((err) => {
  console.error("[stripe-setup] failed:", err.message ?? err);
  process.exit(1);
});
