import { NextResponse } from "next/server";
import { z } from "zod";
import { env, hasStripe } from "@/lib/env";
import { getTier } from "@/lib/stripe/tiers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  tier: z.enum(["plus", "pro", "family"]),
});

export async function POST(request: Request) {
  if (!hasStripe()) {
    return NextResponse.json({ configured: false });
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

  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("line_items[0][price]", priceId);
  form.set("line_items[0][quantity]", "1");
  form.set("success_url", `${siteUrl}/dashboard?upgraded=1`);
  form.set("cancel_url", `${siteUrl}/pricing`);
  if (clientReferenceId) form.set("client_reference_id", clientReferenceId);

  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    if (!response.ok) {
      const errBody = await response.text();
      const correlationId = crypto.randomUUID();
      console.error(`[checkout:${correlationId}]`, errBody);
      return NextResponse.json(
        { error: "Stripe checkout session creation failed.", correlationId },
        { status: 502 },
      );
    }

    const session = (await response.json()) as { url?: string };
    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    }

    return NextResponse.json({ configured: true, url: session.url });
  } catch {
    return NextResponse.json({ error: "Could not reach Stripe." }, { status: 502 });
  }
}
