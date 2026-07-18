import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { env, hasStripe } from "@/lib/env";
import { getTier } from "@/lib/stripe/tiers";
import { createStripeClient } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

const bodySchema = z.object({
  tier: z.enum(["plus", "pro", "family"]),
});

export async function POST(request: Request) {
  if (!hasStripe()) {
    return NextResponse.json({ configured: false });
  }

  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`checkout:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a moment." }, { status: 429 });
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
  const clientReferenceId = user.id;

  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  // hasStripe() above guarantees the key is present.
  const stripe = createStripeClient(env.STRIPE_SECRET_KEY as string);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard?upgraded=1`,
      cancel_url: `${siteUrl}/pricing`,
      ...(clientReferenceId ? { client_reference_id: clientReferenceId } : {}),
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
