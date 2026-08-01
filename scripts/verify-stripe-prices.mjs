#!/usr/bin/env node
/**
 * HōMI Stripe price verification
 * ==============================
 *
 * `stripe-setup.mjs` is idempotent by `lookup_key` — it finds an existing price
 * and reuses it WITHOUT checking the amount. So a price created earlier at the
 * wrong figure survives every subsequent setup run, and the app then charges
 * that while the pricing page advertises something else. This script closes
 * that gap: it compares what Stripe actually holds against the single source of
 * truth in `lib/stripe/tiers.ts`.
 *
 * Read-only — it never creates or modifies a Stripe object.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/verify-stripe-prices.mjs
 *
 * Exits non-zero on any mismatch, so it can gate a deploy.
 */

import { readFileSync } from "node:fs";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("[verify-stripe-prices] Missing STRIPE_SECRET_KEY.");
  process.exit(1);
}

const EXPECT_LIVE = STRIPE_SECRET_KEY.startsWith("sk_live_");

/**
 * Parse tiers.ts rather than duplicating its numbers — duplication is exactly
 * how the amounts drift apart in the first place.
 */
function readExpectedTiers() {
  const src = readFileSync(new URL("../lib/stripe/tiers.ts", import.meta.url), "utf8");
  const tiers = [];
  const blocks = src.split(/\n\s{2}(?=\w+:\s*\{)/);
  for (const block of blocks) {
    const lookup = block.match(/lookupKey:\s*"([^"]+)"/);
    const price = block.match(/priceMonthlyUsd:\s*([\d.]+)/);
    const name = block.match(/name:\s*"([^"]+)"/);
    if (lookup && price) {
      tiers.push({
        lookupKey: lookup[1],
        expectedUsd: Number(price[1]),
        name: name ? name[1] : lookup[1],
      });
    }
  }
  return tiers;
}

async function fetchPrice(lookupKey) {
  const url =
    "https://api.stripe.com/v1/prices?" +
    new URLSearchParams({ "lookup_keys[]": lookupKey, active: "true" }).toString();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe GET /prices failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return (body.data ?? []).find((p) => p.lookup_key === lookupKey) ?? null;
}

async function main() {
  const tiers = readExpectedTiers();
  if (tiers.length === 0) {
    console.error("[verify-stripe-prices] Could not parse any tiers from lib/stripe/tiers.ts.");
    process.exit(1);
  }

  console.log(`[verify-stripe-prices] mode: ${EXPECT_LIVE ? "LIVE" : "test"}  tiers: ${tiers.length}\n`);

  let failures = 0;
  for (const tier of tiers) {
    const price = await fetchPrice(tier.lookupKey);

    if (!price) {
      console.log(`  FAIL  ${tier.lookupKey.padEnd(22)} no active price with this lookup_key`);
      failures++;
      continue;
    }

    const actualUsd = price.unit_amount / 100;
    const problems = [];
    if (actualUsd !== tier.expectedUsd) {
      problems.push(`amount $${actualUsd.toFixed(2)} != tiers.ts $${tier.expectedUsd.toFixed(2)}`);
    }
    if (price.currency !== "usd") problems.push(`currency ${price.currency}`);
    if (price.recurring?.interval !== "month") problems.push(`interval ${price.recurring?.interval}`);
    if (price.livemode !== EXPECT_LIVE) {
      problems.push(`livemode ${price.livemode} but key is ${EXPECT_LIVE ? "live" : "test"}`);
    }

    if (problems.length) {
      console.log(`  FAIL  ${tier.lookupKey.padEnd(22)} ${problems.join("; ")}  (${price.id})`);
      failures++;
    } else {
      console.log(`  ok    ${tier.lookupKey.padEnd(22)} $${actualUsd.toFixed(2)}/mo usd  ${price.id}`);
    }
  }

  console.log("");
  if (failures) {
    console.error(`[verify-stripe-prices] ${failures} mismatch(es). Fix in the Stripe Dashboard before launch.`);
    console.error("Prices are immutable in Stripe — create a new price and update the lookup_key, do not edit.");
    process.exit(1);
  }
  console.log("[verify-stripe-prices] All prices match lib/stripe/tiers.ts.");
}

main().catch((err) => {
  console.error("[verify-stripe-prices] failed:", err.message ?? err);
  process.exit(1);
});
