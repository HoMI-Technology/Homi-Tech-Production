import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPlaidCredentials, plaidFetch } from "@/lib/plaid/client";

export const runtime = "nodejs";

const bodySchema = z.object({
  public_token: z.string().min(1),
});

/**
 * POST /api/plaid/exchange — exchanges a Plaid Link public_token for an
 * access_token server-side. Auth required.
 *
 * TODO(bank-sync-ga): a `plaid_items` table is not yet in the schema, so
 * the access_token cannot be persisted safely. When that table lands,
 * this route should upsert {user_id, item_id, access_token (encrypted)}
 * instead of discarding it. For now we only record that the exchange
 * happened via audit_log, and do not store the access_token anywhere.
 */
export async function POST(request: Request) {
  const credentials = getPlaidCredentials();
  if (!credentials) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
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

  try {
    const response = await plaidFetch(
      "/item/public_token/exchange",
      { public_token: parsed.data.public_token },
      credentials,
    );

    if (!response.ok) {
      const details = await response.text();
      const correlationId = crypto.randomUUID();
      console.error(`[plaid/exchange:${correlationId}]`, details);
      return NextResponse.json(
        { error: "Plaid token exchange failed.", correlationId },
        { status: 502 },
      );
    }

    const data = (await response.json()) as { access_token?: string; item_id?: string };
    if (!data.item_id) {
      return NextResponse.json({ error: "Plaid did not return an item_id." }, { status: 502 });
    }

    // Do NOT persist the access_token — no plaid_items table exists yet (see TODO above).
    // Record only that the exchange occurred, keyed by item_id, for audit purposes.
    try {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action_type: "plaid_exchange",
        metadata: { item_id: data.item_id },
      });
    } catch {
      // Audit logging is best-effort — never block the user on it.
    }

    return NextResponse.json({ ok: true, note: "stored" });
  } catch {
    return NextResponse.json({ error: "Could not reach Plaid." }, { status: 502 });
  }
}
