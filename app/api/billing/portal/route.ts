import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env, hasStripe } from "@/lib/env";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

/** POST /api/billing/portal — creates a Stripe Billing Portal session for the current user. */
export async function POST(request: Request) {
  if (!hasStripe()) {
    return NextResponse.json({ configured: false });
  }

  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`billing-portal:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a moment." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ configured: false });
  }

  try {
    const returnUrl = `${env.NEXT_PUBLIC_SITE_URL}/settings`;
    const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId,
        return_url: returnUrl,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ configured: true, error: "Could not create a billing session." }, { status: 502 });
    }

    const session = (await response.json()) as { url?: string };
    if (!session.url) {
      return NextResponse.json({ configured: true, error: "Billing session had no URL." }, { status: 502 });
    }

    return NextResponse.json({ configured: true, url: session.url });
  } catch {
    return NextResponse.json({ configured: true, error: "Billing portal request failed." }, { status: 502 });
  }
}
