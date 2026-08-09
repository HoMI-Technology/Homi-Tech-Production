import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { env, hasStripe } from "@/lib/env";
import { getTier } from "@/lib/stripe/tiers";
import { createStripeClient } from "@/lib/stripe/server";
import { hasActivePaidSubscription } from "@/lib/stripe/subscription-state";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

const bodySchema = z.object({
  tier: z.enum(["plus", "pro", "family"]),
  /** Where the user started — controls cancel_url. */
  source: z.enum(["pricing", "subscription"]).optional(),
});

export async function POST(request: Request) {
  if (!hasStripe()) {
    return NextResponse.json({ configured: false });
  }

  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`checkout:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a moment." },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const tier = getTier(parsed.data.tier);
  if (!tier) {
    return NextResponse.json({ error: "Unknown tier." }, { status: 400 });
  }

  const priceId = process.env[tier.priceEnvVar];
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price configured for tier "${tier.key}".` },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email, subscription_tier, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if (hasActivePaidSubscription(profile?.subscription_tier, profile?.subscription_status)) {
    return NextResponse.json(
      {
        error: "already_subscribed",
        message:
          "You already have an active HōMI plan. Use Manage billing to change or cancel it — starting Checkout again could double-charge.",
        action: "portal",
        tier: profile?.subscription_tier ?? null,
        status: profile?.subscription_status ?? null,
      },
      { status: 409 },
    );
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  const cancelPath = parsed.data.source === "subscription" ? "/settings/subscription" : "/pricing";
  // hasStripe() above guarantees the key is present.
  const stripe = createStripeClient(env.STRIPE_SECRET_KEY as string);

  const customerId = profile?.stripe_customer_id ?? undefined;
  const customerEmail = user.email ?? profile?.email ?? undefined;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/settings/subscription?upgraded=1`,
      cancel_url: `${siteUrl}${cancelPath}`,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      ...(customerId
        ? { customer: customerId }
        : customerEmail
          ? { customer_email: customerEmail }
          : {}),
      metadata: {
        user_id: user.id,
        tier: tier.key,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier: tier.key,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    }

    return NextResponse.json({ configured: true, url: session.url });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeConnectionError) {
      return NextResponse.json({ error: "Could not reach Stripe." }, { status: 502 });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[checkout:${correlationId}]`, err);
    return NextResponse.json(
      { error: "Stripe checkout session creation failed.", correlationId },
      { status: 502 },
    );
  }
}
