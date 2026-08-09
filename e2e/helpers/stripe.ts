import { createHmac, randomUUID } from "node:crypto";

/**
 * Stripe test-mode plumbing for the checkout smoke path.
 *
 * Deliberately implemented with `node:crypto` + `fetch` only — no `stripe` SDK
 * import — because main's package.json does not carry the SDK (the app's own
 * checkout route uses the same raw-fetch pattern against api.stripe.com).
 *
 * The signature scheme implemented here is Stripe's documented one and matches
 * app/api/webhooks/stripe/route.ts byte-for-byte:
 *   Stripe-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, "<t>.<rawBody>")>
 */

export function signStripePayload(rawBody: string, webhookSecret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

export interface StripeCheckoutSession {
  id: string;
  object: "checkout.session";
  status?: string | null;
  payment_status?: string | null;
  client_reference_id?: string | null;
  customer?: string | null;
  subscription?: string | null;
  url?: string | null;
}

/**
 * Builds a faithful `checkout.session.completed` event around a REAL completed
 * session. The webhook handler re-reads the session's line items from the
 * Stripe API (payloads never embed them), so the session id must be genuine —
 * which is exactly why the spec drives a real test-mode checkout first.
 */
export function buildCheckoutCompletedEvent(session: StripeCheckoutSession): string {
  const event = {
    id: `evt_e2e_${randomUUID().replace(/-/g, "")}`,
    object: "event",
    api_version: null,
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    type: "checkout.session.completed",
    data: { object: session },
  };
  return JSON.stringify(event);
}

/** Minimal GET against the Stripe API (test-mode key required). */
export async function stripeApiGet<T>(path: string, secretKey: string): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!res.ok) {
    throw new Error(`Stripe API GET ${path} -> ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** Minimal POST (form-encoded, per Stripe's API convention). Best-effort cleanup helper. */
export async function stripeApiPost<T>(
  path: string,
  secretKey: string,
  body?: URLSearchParams,
): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: body?.toString(),
  });
  if (!res.ok) {
    throw new Error(`Stripe API POST ${path} -> ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}
