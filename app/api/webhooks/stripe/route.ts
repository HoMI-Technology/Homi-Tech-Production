import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { TIERS, type TierKey } from "@/lib/stripe/tiers";

export const runtime = "nodejs";

const TOLERANCE_SECONDS = 300;

/**
 * Thrown when a Supabase mutation returns a (non-thrown) `.error` that looks
 * transient/infra-level. The top-level handler turns this into an HTTP >=500
 * response so Stripe retries delivery instead of silently losing the event.
 */
class TransientDbError extends Error {}

/**
 * Verifies a Stripe `stripe-signature` header against the raw request
 * body using HMAC-SHA256, per Stripe's documented scheme:
 * signed payload = `${timestamp}.${rawBody}`, compared timing-safe
 * against each `v1=` signature, with a timestamp tolerance window.
 */
function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const parts = signatureHeader.split(",").reduce<Record<string, string[]>>((acc, part) => {
    const [key, value] = part.split("=");
    if (!key || value === undefined) return acc;
    (acc[key] ??= []).push(value);
    return acc;
  }, {});

  const timestamp = parts.t?.[0];
  const v1Signatures = parts.v1 ?? [];
  if (!timestamp || v1Signatures.length === 0) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > TOLERANCE_SECONDS) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");

  return v1Signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, "hex");
    if (sigBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(sigBuf, expectedBuf);
  });
}

function getServiceClient() {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createServiceClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Maps a Stripe price `lookup_key` to a HōMI tier. `lookup_key` is the ONLY
 * signal trusted here — a hardcoded-cents fallback silently mis-tiers any
 * couponed/prorated price, so every price used in Checkout/subscriptions
 * MUST carry one of the lookup keys in `lib/stripe/tiers.ts`.
 */
function mapPriceToTier(lookupKey: string | null | undefined): TierKey | null {
  if (!lookupKey) return null;
  const match = Object.values(TIERS).find((t) => t.lookupKey === lookupKey);
  return match ? match.key : null;
}

/**
 * Maps a Stripe subscription status (+ `cancel_at_period_end`) to the
 * `profiles.subscription_status` value HōMI understands.
 */
function mapSubscriptionStatus(
  stripeStatus: string | null | undefined,
  cancelAtPeriodEnd: boolean | null | undefined,
): string {
  if (stripeStatus === "past_due" || stripeStatus === "unpaid") return "past_due";
  if (stripeStatus === "canceled" || stripeStatus === "cancelled") return "cancelled";
  if (cancelAtPeriodEnd) return "cancelling";
  if (stripeStatus === "active" || stripeStatus === "trialing") return "active";
  return stripeStatus ?? "active";
}

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

/**
 * Fetches the checkout session's line items from the Stripe API.
 *
 * `checkout.session.completed` payloads NEVER include `line_items` (it is an
 * expandable field that only appears on explicit API reads), so relying on
 * the event body for price data silently mis-tiers every subscription. This
 * round-trip is the documented, reliable way to learn what was purchased.
 * (`customer.subscription.updated`/`invoice.*` DO carry price data inline —
 * see `handleSubscriptionUpdated` below, which does NOT round-trip.)
 */
async function fetchSessionPrice(
  sessionId: string,
): Promise<{ lookup_key?: string | null } | null> {
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=1`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: Array<{ price?: { lookup_key?: string | null } }>;
    };
    return body.data?.[0]?.price ?? null;
  } catch {
    return null;
  }
}

async function handleCheckoutCompleted(event: StripeEvent) {
  const session = event.data.object as {
    id?: string;
    client_reference_id?: string | null;
    customer?: string | null;
    subscription?: string | null;
  };

  const userId = session.client_reference_id;
  const customerId = session.customer;
  if (!userId) {
    console.warn("[stripe webhook] checkout.session.completed with no client_reference_id — skipping.");
    return;
  }

  const supabase = getServiceClient();
  if (!supabase) {
    console.warn("[stripe webhook] SUPABASE_SERVICE_ROLE_KEY missing — cannot update profile.");
    return;
  }

  // Authoritative tier resolution: read line items back from the Stripe API
  // (webhook payloads never embed them), enforcing lookup_key only.
  const price = session.id ? await fetchSessionPrice(session.id) : null;
  const tier = mapPriceToTier(price?.lookup_key);

  const patch: Record<string, unknown> = {
    subscription_status: "active",
    stripe_customer_id: customerId ?? null,
  };
  if (tier) {
    patch.subscription_tier = tier;
  } else {
    console.warn(
      `[stripe webhook] could not resolve tier for session ${session.id ?? "?"} — recording customer without tier change.`,
    );
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) {
    throw new TransientDbError(`profiles.update (checkout.session.completed) failed: ${error.message}`);
  }
}

async function handleSubscriptionUpdated(event: StripeEvent) {
  const subscription = event.data.object as {
    customer?: string | null;
    status?: string | null;
    cancel_at_period_end?: boolean | null;
    items?: { data?: Array<{ price?: { lookup_key?: string | null; unit_amount?: number | null } }> };
  };

  const customerId = subscription.customer;
  if (!customerId) return;

  const supabase = getServiceClient();
  if (!supabase) {
    console.warn("[stripe webhook] SUPABASE_SERVICE_ROLE_KEY missing — cannot update profile.");
    return;
  }

  // The event carries the price inline — no Stripe round-trip needed here.
  const lookupKey = subscription.items?.data?.[0]?.price?.lookup_key ?? null;
  const tier = mapPriceToTier(lookupKey);
  const status = mapSubscriptionStatus(subscription.status, subscription.cancel_at_period_end);

  const patch: Record<string, unknown> = { subscription_status: status };
  if (tier) patch.subscription_tier = tier;

  const { error } = await supabase.from("profiles").update(patch).eq("stripe_customer_id", customerId);
  if (error) {
    throw new TransientDbError(`profiles.update (customer.subscription.updated) failed: ${error.message}`);
  }
}

async function handleSubscriptionDeleted(event: StripeEvent) {
  const subscription = event.data.object as { customer?: string | null };
  const customerId = subscription.customer;
  if (!customerId) return;

  const supabase = getServiceClient();
  if (!supabase) {
    console.warn("[stripe webhook] SUPABASE_SERVICE_ROLE_KEY missing — cannot update profile.");
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ subscription_tier: "free", subscription_status: "cancelled" })
    .eq("stripe_customer_id", customerId);
  if (error) {
    throw new TransientDbError(`profiles.update (customer.subscription.deleted) failed: ${error.message}`);
  }
}

async function handleInvoicePaymentFailed(event: StripeEvent) {
  const invoice = event.data.object as { customer?: string | null };
  const customerId = invoice.customer;
  if (!customerId) return;

  const supabase = getServiceClient();
  if (!supabase) {
    console.warn("[stripe webhook] SUPABASE_SERVICE_ROLE_KEY missing — cannot update profile.");
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ subscription_status: "past_due" })
    .eq("stripe_customer_id", customerId);
  if (error) {
    throw new TransientDbError(`profiles.update (invoice.payment_failed) failed: ${error.message}`);
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await request.text();

  if (!signature || !webhookSecret || !verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    console.warn("[stripe webhook] SUPABASE_SERVICE_ROLE_KEY missing — cannot dedupe or process.");
    return NextResponse.json({ received: true });
  }

  // Insert-first idempotency: `webhook_events(event_id)` is UNIQUE. A
  // duplicate delivery hits the unique violation (23505) and is
  // acknowledged WITHOUT re-processing.
  const { error: insertError } = await supabase
    .from("webhook_events")
    .insert({ event_id: event.id, type: event.type });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Couldn't record the event at all — treat as transient so Stripe
    // retries rather than us silently dropping it.
    console.error("[stripe webhook] webhook_events insert failed", insertError);
    return NextResponse.json({ error: "Could not record webhook event." }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;
      default:
        // Unhandled event types are acknowledged, not errors.
        break;
    }
  } catch (err) {
    if (err instanceof TransientDbError) {
      console.error("[stripe webhook] transient DB failure — signalling retry", err);
      return NextResponse.json({ error: "Transient database error." }, { status: 500 });
    }
    console.error("[stripe webhook] handler error", err);
    // A genuine handler bug (not a DB-transience signal) still acknowledges
    // receipt — Stripe retries on non-2xx, and a bug shouldn't cause
    // repeated retries for an event we did receive and record.
  }

  return NextResponse.json({ received: true });
}
