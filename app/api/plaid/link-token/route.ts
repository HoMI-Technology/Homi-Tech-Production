import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlaidCredentials, plaidFetch } from "@/lib/plaid/client";
import { getUserEntitlements, requireCapability } from "@/lib/entitlements";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * GET/POST /api/plaid/link-token — creates a Plaid Link token for the
 * current user. Returns {configured:false} when PLAID_CLIENT_ID/PLAID_SECRET
 * are not set, so the client can render a "coming soon" panel instead of
 * erroring. Auth required (401) and gated on the bankSync capability (402
 * for free tier) — a Link token is the first step of a paid feature, and
 * client_user_id must be a real user id, never "anonymous".
 */
async function handler(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`plaid-link-token:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const credentials = getPlaidCredentials();
  if (!credentials) {
    return NextResponse.json({ configured: false });
  }

  const supabase = await createClient();
  const { userId, entitlements } = await getUserEntitlements(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const gate = requireCapability(userId, entitlements, "bankSync");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const response = await plaidFetch(
      "/link/token/create",
      {
        client_name: "HōMI",
        user: { client_user_id: userId },
        products: ["transactions"],
        country_codes: ["US"],
        language: "en",
      },
      credentials,
    );

    if (!response.ok) {
      const details = await response.text();
      const correlationId = crypto.randomUUID();
      console.error(`[plaid/link-token:${correlationId}]`, details);
      return NextResponse.json(
        { configured: true, error: "Plaid link token creation failed.", correlationId },
        { status: 502 },
      );
    }

    const data = (await response.json()) as { link_token?: string };
    if (!data.link_token) {
      return NextResponse.json(
        { configured: true, error: "Plaid did not return a link_token." },
        { status: 502 },
      );
    }

    return NextResponse.json({ configured: true, link_token: data.link_token });
  } catch {
    return NextResponse.json(
      { configured: true, error: "Could not reach Plaid." },
      { status: 502 },
    );
  }
}

export const GET = handler;
export const POST = handler;
