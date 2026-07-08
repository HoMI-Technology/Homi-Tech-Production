import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { TIERS, type TierKey } from "@/lib/stripe/tiers";

export const runtime = "nodejs";

const TOLERANCE_SECONDS = 300;

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

/** Maps a Stripe price lookup_key or unit_amount (cents) to a HōMI tier. */
function mapPriceToTier(lookupKey: string | null | undefined, unitAmountCents: number | null | undefined): TierKey | null {
  if (lookupKey) {
    const match = Object.values(TIERS).find((t) => t.lookupKey === lookupKey);
    if (match) return match.key;
  }
  if (typeof unitAmountCents === "number") {
    if (unitAmountCents === Math.round(TIERS.plus.priceMonthlyUsd * 100)) return "plus";
    if (unitAmountCents === Math.round(TIERS.pro.priceMonthlyUsd * 100)) return "pro";
    if (unitAmountCents === Math.round(TIERS.family.priceMonthlyUsd * 100)) return "family";
  }
  return null;
}

interface StripeEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

/**
 * Fetches the checkout session's line items from the Stripe API.
 *
 * Webhook payloads NEVER include `line_items` (it is an expandable field
 * that only appears on explicit API reads), so relying on the event body
 * for price data silently mis-tiers every subscription. This round-trip
 * is the documented, reliable way to learn what was purchased.
 */
async function fetchSessionPrice(
  sessionId: string,
): Promise<{ lookup_key?: string | null; unit_amount?: number | null } | null> {
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=1`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: Array<{ price?: { lookup_key?: string | null; unit_amount?: number | null } }>;
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
  // (webhook payloads never embed them), match lookup_key first, then price.
  const price = session.id ? await fetchSessionPrice(session.id) : null;
  const tier = mapPriceToTier(price?.lookup_key, price?.unit_amount);
  if (!tier) {
    console.warn(
      `[stripe webhook] could not resolve tier for session ${session.id ?? "?"} — recording customer without tier change.`,
    );
    await supabase
      .from("profiles")
      .update({ subscription_status: "active", stripe_customer_id: customerId ?? null })
      .eq("id", userId);
    return;
  }

  await supabase
    .from("profiles")
    .update({
      subscription_tier: tier,
      subscription_status: "active",
      stripe_customer_id: customerId ?? null,
    })
    .eq("id", userId);
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

  await supabase
    .from("profiles")
    .update({ subscription_tier: "free", subscription_status: "cancelled" })
    .eq("stripe_customer_id", customerId);
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

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;
      default:
        // Unhandled event types are acknowledged, not errors.
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error", err);
    // Still acknowledge receipt — Stripe retries on non-2xx, and a handler
    // bug shouldn't cause repeated retries for an event we did receive.
  }

  return NextResponse.json({ received: true });
}
