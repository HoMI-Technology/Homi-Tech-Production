import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlaidCredentials } from "@/lib/plaid/client";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { observeLinkedPrefill } from "@/lib/finance/observed-prefill";

export const runtime = "nodejs";

/**
 * GET /api/finance/observed-prefill
 *
 * Suggestions from already-mirrored Plaid Inc transactions (source=plaid
 * on the ledger / plaid_transactions). Assessment prefill uses the same
 * observe/confirm helpers (`lib/finance/observed-prefill`,
 * `lib/finance/prefill-confirm`) — not a second write. Never invents a demo
 * P50. Degrades when PLAID env is missing. Does not enable Investments.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-observed-prefill:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const configured = getPlaidCredentials() !== null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!configured) {
    return NextResponse.json({
      configured: false,
      items: [],
      suggestion: null,
      message: "Bank link is coming soon.",
    });
  }

  const { data: items, error: itemsError } = await supabase
    .from("plaid_items")
    .select("id, institution_name, status, last_successful_sync")
    .eq("user_id", user.id);

  if (itemsError) {
    return NextResponse.json({
      configured: true,
      items: [],
      suggestion: null,
      partial: true,
      message: "Could not load linked banks. Score stays on what you already entered.",
    });
  }

  const linkedItems = (items ?? []).map((item) => ({
    id: item.id as string,
    institutionName: (item.institution_name as string | null) ?? null,
    status: (item.status as string | null) ?? null,
    lastSuccessfulSync: (item.last_successful_sync as string | null) ?? null,
  }));

  if (linkedItems.length === 0) {
    return NextResponse.json({
      configured: true,
      items: [],
      suggestion: null,
      message: "No bank linked yet.",
    });
  }

  const itemIds = linkedItems.map((item) => item.id);
  const [{ data: txns, error: txnError }, { data: accounts, error: acctError }] = await Promise.all([
    supabase
      .from("plaid_transactions")
      .select("amount, pending, txn_date, category")
      .eq("user_id", user.id),
    supabase
      .from("plaid_accounts")
      .select("type, current_balance, available_balance")
      .in("item_id", itemIds),
  ]);

  if (txnError || acctError) {
    return NextResponse.json({
      configured: true,
      items: linkedItems,
      suggestion: null,
      partial: true,
      message: "Linked banks are visible; transaction history is incomplete. Score stays on self-report plus what linked.",
    });
  }

  const suggestion = observeLinkedPrefill(
    (txns ?? []).map((row) => ({
      amount: Number(row.amount),
      pending: row.pending,
      txnDate: row.txn_date,
      category: row.category,
    })),
    (accounts ?? []).map((row) => ({
      type: row.type,
      currentBalance: row.current_balance == null ? null : Number(row.current_balance),
      availableBalance: row.available_balance == null ? null : Number(row.available_balance),
    })),
  );

  return NextResponse.json({
    configured: true,
    items: linkedItems,
    suggestion,
    partial: !suggestion.canVerify,
    message: suggestion.reason,
  });
}
