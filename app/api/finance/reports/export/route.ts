import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { exportTransactionsCsv } from "@/lib/finance/reports";
import {
  FINANCE_LEDGER_INFRA_MISSING,
  rowToCategory,
  rowToTransaction,
  type FinanceCategoryRow,
  type FinanceTransactionRow,
} from "@/lib/finance/db-map";

export const runtime = "nodejs";

const TX_COLS =
  "id, user_id, type, status, amount_cents, currency, description, merchant_name, category_id, account_id, transaction_date, posted_at, source, external_transaction_id, recurring_rule_id, transfer_group_id, parent_transaction_id, is_excluded_from_budget, user_note, created_at, updated_at, deleted_at";

const MAX_ROWS = 10_000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/finance/reports/export?format=csv&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Downloads the caller's transactions as an RFC-4180 CSV (date, payee,
 * category, type, amount, status, source). `from`/`to` are optional
 * date-only bounds; an empty range yields a header-only file, not an
 * error. Only csv is supported.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-reports-export:${ip}`, {
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

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "csv";
  if (format !== "csv") {
    return NextResponse.json({ error: "Only format=csv is supported." }, { status: 400 });
  }

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if ((from !== null && !DATE_ONLY.test(from)) || (to !== null && !DATE_ONLY.test(to))) {
    return NextResponse.json(
      { error: "from/to must be YYYY-MM-DD dates." },
      { status: 400 },
    );
  }
  if (from !== null && to !== null && from > to) {
    return NextResponse.json({ error: "from must not be after to." }, { status: 400 });
  }

  let query = supabase
    .from("finance_transactions")
    .select(TX_COLS)
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: true })
    .limit(MAX_ROWS);
  if (from !== null) query = query.gte("transaction_date", from);
  if (to !== null) query = query.lte("transaction_date", to);

  const [{ data: txRows, error: txError }, { data: catRows, error: catError }] =
    await Promise.all([
      query,
      supabase.from("finance_categories").select("id, user_id, name, slug, category_type, essentiality, parent_category_id, is_system, is_archived, created_at, updated_at"),
    ]);

  for (const [scope, error] of [
    ["transactions", txError],
    ["categories", catError],
  ] as const) {
    if (error) {
      if (error.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
        return NextResponse.json({ deferred: true }, { status: 202 });
      }
      const correlationId = crypto.randomUUID();
      console.error(`[finance-reports-export:${scope}:${correlationId}]`, error.message);
      return NextResponse.json(
        { error: "Could not export transactions.", correlationId },
        { status: 500 },
      );
    }
  }

  const transactions = ((txRows ?? []) as FinanceTransactionRow[]).map(rowToTransaction);
  const categories = ((catRows ?? []) as FinanceCategoryRow[]).map(rowToCategory);
  const csv = exportTransactionsCsv(transactions, categories);

  const filename = `homi-transactions-${from ?? "all"}-${to ?? "all"}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
