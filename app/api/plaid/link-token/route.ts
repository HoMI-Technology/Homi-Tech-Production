import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlaidCredentials, plaidFetch } from "@/lib/plaid/client";

export const runtime = "nodejs";

/**
 * GET/POST /api/plaid/link-token — creates a Plaid Link token for the
 * current user. Returns {configured:false} when PLAID_CLIENT_ID/PLAID_SECRET
 * are not set, so the client can render a "coming soon" panel instead of
 * erroring.
 */
async function handler() {
  const credentials = getPlaidCredentials();
  if (!credentials) {
    return NextResponse.json({ configured: false });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const clientUserId = user?.id ?? "anonymous";

  try {
    const response = await plaidFetch(
      "/link/token/create",
      {
        client_name: "HōMI",
        user: { client_user_id: clientUserId },
        products: ["transactions"],
        country_codes: ["US"],
        language: "en",
      },
      credentials,
    );

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        { configured: true, error: "Plaid link token creation failed.", details },
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
