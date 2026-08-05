#!/usr/bin/env node
/**
 * Ensure the default Stripe Customer Portal configuration allows:
 * - subscription plan updates (with proration)
 * - cancellation
 * - payment method updates
 * - invoice history
 *
 * Also attaches the three HōMI monthly products (by price lookup_key) so
 * customers can switch Plus ↔ Pro ↔ Family in the portal.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/ensure-stripe-billing-portal.mjs
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/ensure-stripe-billing-portal.mjs
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("[billing-portal] Missing STRIPE_SECRET_KEY.");
  process.exit(1);
}

const LOOKUP_KEYS = ["homi_plus_monthly", "homi_pro_monthly", "homi_family_monthly"];
const mode = STRIPE_SECRET_KEY.startsWith("sk_live_") ? "LIVE" : "test";

async function stripe(path, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function resolveProductIds() {
  const products = new Set();
  for (const key of LOOKUP_KEYS) {
    const q = new URLSearchParams({ "lookup_keys[]": key, active: "true", limit: "1" });
    const list = await stripe(`/prices?${q}`);
    const price = list.data?.[0];
    if (!price) {
      console.error(`[billing-portal] No active price for lookup_key=${key}`);
      process.exit(1);
    }
    const productId = typeof price.product === "string" ? price.product : price.product?.id;
    if (!productId) {
      console.error(`[billing-portal] Price ${price.id} has no product`);
      process.exit(1);
    }
    products.add(productId);
    console.log(`  price ${key} → ${price.id} product=${productId}`);
  }
  return [...products];
}

async function main() {
  console.log(`[billing-portal] mode=${mode}\n`);
  const productIds = await resolveProductIds();

  const configs = await stripe("/billing_portal/configurations?limit=10&active=true");
  let config = configs.data?.[0] ?? null;

  const form = {
    "features[customer_update][enabled]": "true",
    "features[customer_update][allowed_updates][0]": "email",
    "features[customer_update][allowed_updates][1]": "address",
    "features[invoice_history][enabled]": "true",
    "features[payment_method_update][enabled]": "true",
    "features[subscription_cancel][enabled]": "true",
    "features[subscription_cancel][mode]": "at_period_end",
    "features[subscription_update][enabled]": "true",
    "features[subscription_update][default_allowed_updates][0]": "price",
    "features[subscription_update][proration_behavior]": "create_prorations",
    "business_profile[privacy_policy_url]": "https://homitechnology.com/privacy",
    "business_profile[terms_of_service_url]": "https://homitechnology.com/terms",
  };

  productIds.forEach((id, i) => {
    form[`features[subscription_update][products][${i}][product]`] = id;
    // empty prices array means all prices on the product
    form[`features[subscription_update][products][${i}][prices][0]`] = "";
  });

  // Stripe rejects empty price entries — instead list each price id.
  // Rebuild product→prices map properly.
  const productPrices = new Map();
  for (const key of LOOKUP_KEYS) {
    const q = new URLSearchParams({ "lookup_keys[]": key, active: "true", limit: "1" });
    const list = await stripe(`/prices?${q}`);
    const price = list.data[0];
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    if (!productPrices.has(productId)) productPrices.set(productId, []);
    productPrices.get(productId).push(price.id);
  }

  // Clear naive product form keys and rewrite
  for (const k of Object.keys(form)) {
    if (k.startsWith("features[subscription_update][products]")) delete form[k];
  }
  let pIdx = 0;
  for (const [productId, prices] of productPrices) {
    form[`features[subscription_update][products][${pIdx}][product]`] = productId;
    prices.forEach((priceId, j) => {
      form[`features[subscription_update][products][${pIdx}][prices][${j}]`] = priceId;
    });
    pIdx += 1;
  }

  if (config) {
    console.log(`\nUpdating configuration ${config.id}…`);
    config = await stripe(`/billing_portal/configurations/${config.id}`, {
      method: "POST",
      body: form,
    });
  } else {
    console.log("\nCreating default billing portal configuration…");
    form.default_return_url = "https://homitechnology.com/settings/subscription";
    config = await stripe("/billing_portal/configurations", {
      method: "POST",
      body: form,
    });
  }

  console.log(`\n[billing-portal] ok id=${config.id} active=${config.active}`);
  console.log(
    `  subscription_update=${config.features?.subscription_update?.enabled} cancel=${config.features?.subscription_cancel?.enabled}`,
  );
}

main().catch((err) => {
  console.error("[billing-portal] failed:", err.message);
  process.exit(1);
});
