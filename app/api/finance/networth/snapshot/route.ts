import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { computeNetWorthSnapshot } from "@/lib/finance/networth";
import { FINANCE_LEDGER_INFRA_MISSING } from "@/lib/finance/db-map";

export const runtime = "nodejs";

const SELECT_COLS =
  "id, user_id, snapshot_date, total_assets_cents, total_liabilities_cents, net_worth_cents, source, breakdown, created_at";

/**
 * POST /api/finance/networth/snapshot — computes today's net worth from the
 * caller's live plaid_accounts / plaid_holdings / plaid_liabilities rows and
 * persists it. Idempotent per day: the (user_id, snapshot_date) unique key
 * means a repeat call upserts the same day's row, never duplicates it.
 *
 * Read-only use of Plaid data; nothing here is a consumer report. Missing
 * balances are excluded and counted (completeness grade), never invented.
 * plaid_account_owners is never touched (server-only by design).
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-networth-write:${ip}`, {
    limit: 10,
    windowMs: 60_000,
  });
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

  // plaid_accounts has no user_id column by design; ownership is resolved
  // through plaid_items (RLS enforces the same join).
  const { data: itemRows, error: itemError } = await supabase
    .from("plaid_items")
    .select("id")
    .eq("user_id", user.id);

  if (itemError) {
    const correlationId = crypto.randomUUID();
    console.error(`[finance-networth:items:${correlationId}]`, itemError.message);
    return NextResponse.json(
      { error: "Could not compute net worth.", correlationId },
      { status: 500 },
    );
  }

  const itemIds = ((itemRows ?? []) as { id: string }[]).map((row) => row.id);

  const [{ data: accountRows, error: accountError }, { data: holdingRows, error: holdingError }, { data: liabilityRows, error: liabilityError }] =
    await Promise.all([
      itemIds.length > 0
        ? supabase
            .from("plaid_accounts")
            .select("account_id, type, subtype, current_balance, iso_currency")
            .in("item_id", itemIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("plaid_holdings")
        .select("account_id, institution_value")
        .eq("user_id", user.id),
      supabase
        .from("plaid_liabilities")
        .select("account_id, kind, payload")
        .eq("user_id", user.id),
    ]);

  for (const [scope, error] of [
    ["accounts", accountError],
    ["holdings", holdingError],
    ["liabilities", liabilityError],
  ] as const) {
    if (error) {
      const correlationId = crypto.randomUUID();
      console.error(`[finance-networth:${scope}:${correlationId}]`, error.message);
      return NextResponse.json(
        { error: "Could not compute net worth.", correlationId },
        { status: 500 },
      );
    }
  }

  // Snapshot date is the server's UTC day — a capture timestamp, not a
  // budget-month boundary (those stay in the user's frame).
  const asOfDate = new Date().toISOString().slice(0, 10);

  const snapshot = computeNetWorthSnapshot(
    ((accountRows ?? []) as {
      account_id: string;
      type: string;
      subtype: string | null;
      current_balance: number | null;
      iso_currency: string | null;
    }[]).map((row) => ({
      // Match holdings/liabilities on the external plaid account_id.
      id: row.account_id,
      type: row.type,
      subtype: row.subtype,
      currentBalance: row.current_balance,
      isoCurrency: row.iso_currency,
    })),
    ((holdingRows ?? []) as { account_id: string; institution_value: number | null }[]).map(
      (row) => ({ accountId: row.account_id, institutionValue: row.institution_value }),
    ),
    ((liabilityRows ?? []) as {
      account_id: string;
      kind: string;
      payload: Record<string, unknown>;
    }[]).map((row) => ({ accountId: row.account_id, kind: row.kind, payload: row.payload })),
    asOfDate,
    "plaid",
  );

  const { data: saved, error: saveError } = await supabase
    .from("finance_net_worth_snapshots")
    .upsert(
      {
        user_id: user.id,
        snapshot_date: snapshot.asOfDate,
        total_assets_cents: snapshot.totalAssetsCents,
        total_liabilities_cents: snapshot.totalLiabilitiesCents,
        net_worth_cents: snapshot.netWorthCents,
        source: snapshot.source,
        breakdown: {
          entries: snapshot.breakdown,
          completeness: snapshot.completeness,
          accountsWithData: snapshot.accountsWithData,
          accountsMissingData: snapshot.accountsMissingData,
        },
      },
      { onConflict: "user_id,snapshot_date" },
    )
    .select(SELECT_COLS)
    .single();

  if (saveError || !saved) {
    if (saveError?.code && FINANCE_LEDGER_INFRA_MISSING.has(saveError.code)) {
      return NextResponse.json({ deferred: true, snapshot: null }, { status: 202 });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-networth:save:${correlationId}]`, saveError?.message);
    return NextResponse.json(
      { error: "Could not save the snapshot.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({ snapshot }, { status: 201 });
}
