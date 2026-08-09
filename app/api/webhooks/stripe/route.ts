import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { TIERS, type TierKey } from "@/lib/stripe/tiers";
import { createStripeClient } from "@/lib/stripe/server";
import { captureServerEvent } from "@/lib/analytics/server";

export const runtime = "nodejs";

class TransientDbError extends Error {}

function getServiceClient() {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createServiceClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function mapPriceToTier(lookupKey: string | null | undefined): TierKey | null {
  if (!lookupKey) return null;
  const match = Object.values(TIERS).find((t) => t.lookupKey === lookupKey);
  return match ? match.key : null;
}

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

type SessionPriceResult =
  | { ok: true; lookupKey: string | null }
  | { ok: false; reason: "stripe_key_missing" | "api_error" };

async function fetchSessionPrice(sessionId: string): Promise<SessionPriceResult> {
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) return { ok: false, reason: "stripe_key_missing" };
  try {
    const stripe = createStripeClient(secretKey);
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 1 });
    const price = lineItems.data[0]?.price;
    if (!price || typeof price === "string" || !("lookup_key" in price)) {
      return { ok: true, lookupKey: null };
    }
    return { ok: true, lookupKey: price.lookup_key ?? null };
  } catch {
    return { ok: false, reason: "api_error" };
  }
}

// Record payment events for the admin revenue ledger (`payments` table).
// Checkout success is the primary path for HōMI subscriptions — Stripe may
// deliver `checkout.session.completed` without a separately-subscribed
// `payment_intent.succeeded`, so we ledger from both Checkout and invoice
// success as well as the PI/charge events.
async function recordPayment(
  supabase: NonNullable<ReturnType<typeof getServiceClient>>,
  event: Stripe.Event,
) {
  let paymentIntentId: string | undefined;
  let amount: number | undefined;
  let currency = "usd";
  let userId: string | null = null;
  let customerId: string | null = null;
  let description = `Stripe ${event.type}`;
  let status: "succeeded" | "pending" | "failed" | "refunded" = "succeeded";

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const pi = session.payment_intent;
    paymentIntentId =
      typeof pi === "string"
        ? pi
        : pi && typeof pi === "object" && "id" in pi
          ? String(pi.id)
          : undefined;
    // Do NOT invent a synthetic `checkout_${session.id}` key. Subscription
    // checkouts often omit payment_intent here and later deliver the same
    // money via invoice.payment_succeeded / payment_intent.succeeded with a
    // real PI id — a synthetic key would double-count revenue.
    amount = session.amount_total ?? undefined;
    currency = session.currency ?? "usd";
    userId = session.client_reference_id ?? null;
    customerId = typeof session.customer === "string" ? session.customer : null;
    description = "Checkout completed";
    status =
      session.payment_status === "paid" || session.payment_status === "no_payment_required"
        ? "succeeded"
        : "pending";
  } else if (event.type === "invoice.payment_succeeded") {
    // Stripe API ≥2025 moved PI off the Invoice top-level; webhook payloads
    // may still carry `payment_intent` as a string, so read it defensively.
    const invoice = event.data.object as Stripe.Invoice & {
      payment_intent?: string | Stripe.PaymentIntent | null;
    };
    const pi = invoice.payment_intent;
    paymentIntentId =
      typeof pi === "string"
        ? pi
        : pi && typeof pi === "object" && "id" in pi
          ? String(pi.id)
          : undefined;
    // Invoice-only fallback is safe: renewals won't also emit a Checkout
    // session with a conflicting synthetic key.
    if (!paymentIntentId && invoice.id) {
      paymentIntentId = `invoice_${invoice.id}`;
    }
    amount = invoice.amount_paid ?? undefined;
    currency = invoice.currency ?? "usd";
    customerId = typeof invoice.customer === "string" ? invoice.customer : null;
    description =
      invoice.billing_reason === "subscription_create" ? "Subscription started" : "Invoice paid";
    status = "succeeded";
  } else if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.created") {
    const pi = event.data.object as Stripe.PaymentIntent;
    paymentIntentId = pi.id;
    amount = pi.amount;
    currency = pi.currency;
    customerId = typeof pi.customer === "string" ? pi.customer : null;
    status = event.type === "payment_intent.succeeded" ? "succeeded" : "pending";
  } else if (event.type === "charge.succeeded") {
    const charge = event.data.object as Stripe.Charge;
    paymentIntentId =
      typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    amount = charge.amount;
    currency = charge.currency;
    customerId = typeof charge.customer === "string" ? charge.customer : null;
  } else if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    paymentIntentId =
      typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    // Prefer the original charge amount so the ledger row stays findable;
    // status flips to refunded so admin revenue excludes it.
    amount = charge.amount_refunded > 0 ? charge.amount_refunded : charge.amount;
    currency = charge.currency;
    customerId = typeof charge.customer === "string" ? charge.customer : null;
    description = charge.refunded ? "Charge refunded" : "Charge partially refunded";
    status = "refunded";
  }

  // Schema requires amount > 0; skip $0 / free / missing amounts.
  if (!paymentIntentId || amount === undefined || amount <= 0) return;

  if (!userId && customerId) {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .limit(1);
      userId = profiles?.[0]?.id ?? null;
    } catch {
      /* best-effort */
    }
  }

  const { error } = await supabase.from("payments").upsert(
    {
      stripe_payment_intent_id: paymentIntentId,
      user_id: userId,
      amount,
      currency,
      status,
      description,
      // Omit created_at so INSERT uses the DB default and UPDATE does not
      // rewrite the original timestamp (keeps the 30-day revenue window honest
      // across Stripe retries / multi-event upserts for the same PI).
    },
    { onConflict: "stripe_payment_intent_id" },
  );

  if (error) {
    console.warn("[stripe webhook] payments upsert failed:", error.message);
  }
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as {
    id?: string;
    client_reference_id?: string | null;
    customer?: string | null;
    subscription?: string | null;
  };

  const userId = session.client_reference_id;
  const customerId = session.customer;
  if (!userId) {
    console.warn(
      "[stripe webhook] checkout.session.completed with no client_reference_id — skipping.",
    );
    return;
  }

  const supabase = getServiceClient();
  if (!supabase) {
    console.warn("[stripe webhook] SUPABASE_SERVICE_ROLE_KEY missing — cannot update profile.");
    return;
  }

  if (!session.id) {
    console.error(
      "[stripe webhook] checkout.session.completed with no session id — cannot resolve tier.",
    );
    return;
  }

  const price = await fetchSessionPrice(session.id);
  if (!price.ok) {
    throw new TransientDbError(
      `line-item fetch failed (${price.reason}) for session ${session.id} — retrying so the tier is not lost.`,
    );
  }
  const tier = mapPriceToTier(price.lookupKey);

  const patch: Record<string, unknown> = {
    subscription_status: "active",
    stripe_customer_id: customerId ?? null,
  };
  if (tier) {
    patch.subscription_tier = tier;
  } else {
    console.error(
      `[stripe webhook] UNMAPPED price lookup_key ${JSON.stringify(price.lookupKey)} for session ${session.id}`,
    );
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) {
    throw new TransientDbError(
      `profiles.update (checkout.session.completed) failed: ${error.message}`,
    );
  }

  captureServerEvent("checkout_completed", userId, tier ? { tier } : undefined);
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as {
    customer?: string | null;
    status?: string | null;
    cancel_at_period_end?: boolean | null;
    items?: {
      data?: Array<{ price?: { lookup_key?: string | null; unit_amount?: number | null } }>;
    };
  };

  const customerId = subscription.customer;
  if (!customerId) return;

  const supabase = getServiceClient();
  if (!supabase) {
    console.warn("[stripe webhook] SUPABASE_SERVICE_ROLE_KEY missing — cannot update profile.");
    return;
  }

  const lookupKey = subscription.items?.data?.[0]?.price?.lookup_key ?? null;
  const tier = mapPriceToTier(lookupKey);
  const status = mapSubscriptionStatus(subscription.status, subscription.cancel_at_period_end);

  const patch: Record<string, unknown> = { subscription_status: status };
  if (tier) patch.subscription_tier = tier;

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("stripe_customer_id", customerId);
  if (error) {
    throw new TransientDbError(
      `profiles.update (customer.subscription.updated) failed: ${error.message}`,
    );
  }
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
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
    throw new TransientDbError(
      `profiles.update (customer.subscription.deleted) failed: ${error.message}`,
    );
  }
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
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

  let event: Stripe.Event;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  try {
    const stripe = createStripeClient(env.STRIPE_SECRET_KEY ?? "webhook_verify_only");
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    console.error("[stripe webhook] SUPABASE_SERVICE_ROLE_KEY missing — cannot dedupe or process.");
    return NextResponse.json(
      { error: "Server misconfigured; webhook will retry." },
      { status: 500 },
    );
  }

  const { error: insertError } = await supabase
    .from("webhook_events")
    .insert({ event_id: event.id, type: event.type });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[stripe webhook] webhook_events insert failed", insertError);
    return NextResponse.json({ error: "Could not record webhook event." }, { status: 500 });
  }

  // Record payment ledger rows for the admin revenue panel.
  if (
    event.type === "checkout.session.completed" ||
    event.type === "invoice.payment_succeeded" ||
    event.type === "payment_intent.succeeded" ||
    event.type === "payment_intent.created" ||
    event.type === "charge.succeeded" ||
    event.type === "charge.refunded"
  ) {
    await recordPayment(supabase, event);
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
        break;
    }
  } catch (err) {
    if (err instanceof TransientDbError) {
      try {
        await supabase.from("webhook_events").delete().eq("event_id", event.id);
      } catch (rollbackErr) {
        console.error("[stripe webhook] ledger rollback failed", rollbackErr);
      }
      console.error("[stripe webhook] transient failure — released claim, signalling retry", err);
      return NextResponse.json({ error: "Transient database error." }, { status: 500 });
    }
    console.error("[stripe webhook] handler error", err);
  }

  return NextResponse.json({ received: true });
}
