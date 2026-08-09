import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlaidCredentials } from "@/lib/plaid/client";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Postgres/PostgREST codes meaning "migration 00017 isn't applied yet". */
const INFRA_MISSING_CODES = new Set([
  "42P01", // undefined_table
  "PGRST205", // PostgREST: table not found in schema cache
]);

/**
 * GET /api/plaid/accounts — lists the caller's connected bank accounts from
 * the database (no Plaid API call here; the sync path keeps balances fresh).
 * Reads go through the user-scoped client, so RLS + the column-level grant on
 * plaid_items guarantee only safe columns of the caller's own rows are
 * reachable — access_token_ct can never transit this route.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`plaid-accounts:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const configured = getPlaidCredentials() !== null;

  const { data: items, error: itemsError } = await supabase
    .from("plaid_items")
    .select("id, institution_name, status, last_successful_sync")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    if (itemsError.code && INFRA_MISSING_CODES.has(itemsError.code)) {
      // Tables not migrated yet — report honestly empty instead of erroring.
      return NextResponse.json({ configured, items: [] });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[plaid/accounts:${correlationId}]`, itemsError.message);
    return NextResponse.json(
      { error: "Could not load bank connections.", correlationId },
      { status: 500 },
    );
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ configured, items: [] });
  }

  const { data: accounts, error: accountsError } = await supabase
    .from("plaid_accounts")
    .select(
      "id, item_id, account_id, name, mask, type, subtype, current_balance, available_balance, iso_currency, updated_at",
    )
    .in(
      "item_id",
      items.map((item) => item.id),
    );

  if (accountsError) {
    const correlationId = crypto.randomUUID();
    console.error(`[plaid/accounts:${correlationId}]`, accountsError.message);
    return NextResponse.json(
      { error: "Could not load bank accounts.", correlationId },
      { status: 500 },
    );
  }

  const accountsByItem = new Map<string, Record<string, unknown>[]>();
  for (const account of accounts ?? []) {
    const { item_id: itemId, ...rest } = account;
    const bucket = accountsByItem.get(itemId) ?? [];
    bucket.push(rest);
    accountsByItem.set(itemId, bucket);
  }

  return NextResponse.json({
    configured,
    items: items.map((item) => ({
      id: item.id,
      institution_name: item.institution_name,
      status: item.status,
      last_successful_sync: item.last_successful_sync,
      accounts: accountsByItem.get(item.id) ?? [],
    })),
  });
}
