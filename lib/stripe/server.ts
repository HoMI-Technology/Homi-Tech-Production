import Stripe from "stripe";

/**
 * Server-side Stripe client factory (official `stripe` SDK).
 *
 * A fresh client is created per call: construction is cheap, it captures
 * `globalThis.fetch` at build time (so tests can stub fetch per-request),
 * and it never caches a key across requests. The SDK pins its own API
 * version — we deliberately do NOT pass `apiVersion`, so the pinned default
 * documented for this SDK release is used.
 *
 * The fetch HTTP client is requested explicitly so behaviour is identical
 * on Node and any future edge-ish runtime, and so the SDK never depends on
 * Node's `http` module being polyfilled.
 */
export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}
