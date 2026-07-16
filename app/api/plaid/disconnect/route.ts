import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlaidCredentials, plaidFetch } from "@/lib/plaid/client";
import { decryptToken } from "@/lib/plaid/crypto";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const bodySchema = z.object({
  /** plaid_items row id (uuid). */
  item_id: z.string().uuid(),
});

/**
 * POST /api/plaid/disconnect — removes a bank connection. This doubles as the
 * compliance "delete my bank data" flow, so it must always succeed locally:
 *   1. Verify the caller owns the item (auth only — no entitlement gate; a
 *      downgraded user must still be able to disconnect).
 *   2. Best-effort Plaid /item/remove (invalidates the access token). A Plaid
 *      failure is logged with a correlation id but NEVER blocks the purge.
 *   3. Delete the plaid_items row — plaid_accounts cascades with it.
 *   4. Audit-log "plaid_disconnect".
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`plaid-disconnect:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
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

  const admin = createAdminClient();
  if (!admin) {
    const correlationId = crypto.randomUUID();
    console.error(`[plaid/disconnect:${correlationId}] SUPABASE_SERVICE_ROLE_KEY missing`);
    return NextResponse.json(
      { error: "Disconnect is not available right now.", correlationId },
      { status: 503 },
    );
  }

  // Ownership check + token fetch in one read (service role — the ciphertext
  // column is unreachable from the user-scoped client by design).
  const { data: item, error: itemError } = await admin
    .from("plaid_items")
    .select("id, user_id, item_id, access_token_ct, institution_id, institution_name")
    .eq("id", parsed.data.item_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (itemError) {
    const correlationId = crypto.randomUUID();
    console.error(`[plaid/disconnect:${correlationId}]`, itemError.message);
    return NextResponse.json(
      { error: "Could not load the bank connection.", correlationId },
      { status: 500 },
    );
  }
  if (!item) {
    return NextResponse.json({ error: "Bank connection not found." }, { status: 404 });
  }

  // Best-effort revocation at Plaid — local purge proceeds regardless.
  const credentials = getPlaidCredentials();
  if (credentials) {
    try {
      const accessToken = decryptToken(item.access_token_ct);
      const res = await plaidFetch("/item/remove", { access_token: accessToken }, credentials);
      if (!res.ok) {
        const correlationId = crypto.randomUUID();
        console.error(`[plaid/disconnect:${correlationId}] /item/remove returned ${res.status}`);
      }
    } catch (err) {
      const correlationId = crypto.randomUUID();
      console.error(
        `[plaid/disconnect:${correlationId}] /item/remove failed:`,
        err instanceof Error ? err.message : "unknown error",
      );
    }
  }

  // The local purge is the part that must not fail silently.
  const { error: deleteError } = await admin.from("plaid_items").delete().eq("id", item.id);
  if (deleteError) {
    const correlationId = crypto.randomUUID();
    console.error(`[plaid/disconnect:${correlationId}] plaid_items delete failed`, deleteError.message);
    return NextResponse.json(
      { error: "Could not remove the bank connection.", correlationId },
      { status: 500 },
    );
  }

  try {
    await supabase.from("audit_log").insert({
      user_id: user.id,
      action_type: "plaid_disconnect",
      metadata: { item_id: item.item_id, institution_id: item.institution_id },
    });
  } catch {
    // Audit logging is best-effort — never block the user on it.
  }

  return NextResponse.json({ ok: true });
}
