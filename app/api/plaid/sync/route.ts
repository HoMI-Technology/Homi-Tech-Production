import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlaidCredentials } from "@/lib/plaid/client";
import { getUserEntitlements, requireCapability } from "@/lib/entitlements";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { syncItem, type SyncableItem } from "@/lib/plaid/sync";

export const runtime = "nodejs";

const bodySchema = z.object({
  /** plaid_items row id (uuid) — omit to sync every connected item. */
  item_id: z.string().uuid().optional(),
});

/**
 * POST /api/plaid/sync — manual "Sync now". Auth + bankSync capability, then
 * runs the shared sync for the caller's items (optionally one item via
 * {item_id}). Deliberately tight per-user rate limit: webhooks keep data
 * fresh on their own, so rapid manual re-syncs would only hammer Plaid.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`plaid-sync-ip:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const credentials = getPlaidCredentials();
  if (!credentials) {
    return NextResponse.json({ configured: false }, { status: 200 });
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

  // "Too soon" guard — a sync just ran for this user; let it breathe.
  const userLimit = await rateLimit(`plaid-sync-user:${userId}`, { limit: 3, windowMs: 5 * 60_000 });
  if (!userLimit.allowed) {
    return NextResponse.json(
      { error: "A sync ran recently. Give it a few minutes and try again." },
      { status: 429 },
    );
  }

  // Body is optional: absent/empty → sync all of the caller's items.
  let itemIdFilter: string | undefined;
  const rawBody = await request.text();
  if (rawBody.trim().length > 0) {
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    itemIdFilter = parsed.data.item_id;
  }

  const admin = createAdminClient();
  if (!admin) {
    const correlationId = crypto.randomUUID();
    console.error(`[plaid/sync:${correlationId}] SUPABASE_SERVICE_ROLE_KEY missing`);
    return NextResponse.json(
      { error: "Bank sync is not available right now.", correlationId },
      { status: 503 },
    );
  }

  // Ownership is enforced here: only rows with the caller's user_id are read.
  let query = admin
    .from("plaid_items")
    .select("id, user_id, item_id, access_token_ct, transactions_cursor, status")
    .eq("user_id", userId);
  if (itemIdFilter) {
    query = query.eq("id", itemIdFilter);
  }
  const { data: items, error: itemsError } = await query;

  if (itemsError) {
    const correlationId = crypto.randomUUID();
    console.error(`[plaid/sync:${correlationId}]`, itemsError.message);
    return NextResponse.json(
      { error: "Could not load bank connections.", correlationId },
      { status: 500 },
    );
  }
  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: itemIdFilter ? "Bank connection not found." : "No bank connections to sync." },
      { status: 404 },
    );
  }

  const results: { item_id: string; ok: boolean; error?: string; correlationId?: string }[] = [];
  for (const item of items) {
    // A revoked item has no working token — reconnecting is the only fix.
    if (item.status === "revoked") {
      results.push({ item_id: item.id, ok: false, error: "Connection was revoked. Reconnect to resume syncing." });
      continue;
    }
    try {
      await syncItem(admin, item as SyncableItem);
      results.push({ item_id: item.id, ok: true });
    } catch (err) {
      const correlationId = crypto.randomUUID();
      console.error(
        `[plaid/sync:${correlationId}] item sync failed:`,
        err instanceof Error ? err.message : "unknown error",
      );
      results.push({
        item_id: item.id,
        ok: false,
        error: "Sync failed for this connection.",
        correlationId,
      });
    }
  }

  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}
