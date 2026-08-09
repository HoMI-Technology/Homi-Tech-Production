import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { transactionCreateSchema } from "@/lib/finance/validation";
import {
  FINANCE_LEDGER_INFRA_MISSING,
  rowToTransaction,
  type FinanceTransactionRow,
} from "@/lib/finance/db-map";

export const runtime = "nodejs";

const SELECT_COLS =
  "id, user_id, type, status, amount_cents, currency, description, merchant_name, category_id, account_id, transaction_date, posted_at, source, external_transaction_id, recurring_rule_id, transfer_group_id, parent_transaction_id, is_excluded_from_budget, user_note, created_at, updated_at, deleted_at";

/**
 * GET /api/finance/transactions — paginated posted+pending rows for the caller
 * (soft-deleted excluded). Query: ?limit=50&cursor=<updated_at ISO>&includeDeleted=0
 *
 * POST /api/finance/transactions — create a manual transaction with idempotency.
 * Body validated by transactionCreateSchema (PR 1). userId always from session.
 */

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-tx-read:${ip}`, { limit: 60, windowMs: 60_000 });
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
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100) : 50;
  const cursor = url.searchParams.get("cursor");
  const includeDeleted = url.searchParams.get("includeDeleted") === "1";

  let query = supabase
    .from("finance_transactions")
    .select(SELECT_COLS)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }
  if (cursor) {
    // Keyset on updated_at (ISO). Stale cursors simply return a fresh page.
    query = query.lt("updated_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
      return NextResponse.json({ transactions: [], nextCursor: null, deferred: true });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-tx:list:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not load transactions.", correlationId },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as FinanceTransactionRow[];
  const transactions = rows.map(rowToTransaction);
  const nextCursor = rows.length === limit ? (rows[rows.length - 1]?.updated_at ?? null) : null;

  return NextResponse.json({ transactions, nextCursor });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-tx-write:${ip}`, { limit: 30, windowMs: 60_000 });
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = transactionCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid transaction.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Idempotency: return the prior response body when the key was already used.
  const { data: prior, error: priorError } = await supabase
    .from("finance_mutation_idempotency")
    .select("resource_id, response_status, response_body")
    .eq("user_id", user.id)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (priorError && !(priorError.code && FINANCE_LEDGER_INFRA_MISSING.has(priorError.code))) {
    const correlationId = crypto.randomUUID();
    console.error(`[finance-tx:idem-read:${correlationId}]`, priorError.message);
    return NextResponse.json(
      { error: "Could not create transaction.", correlationId },
      { status: 500 },
    );
  }

  if (prior) {
    return NextResponse.json(prior.response_body, { status: prior.response_status });
  }

  const nowIso = new Date().toISOString();
  const insertRow = {
    id: input.id,
    user_id: user.id,
    type: input.type,
    status: "posted" as const,
    amount_cents: input.amountCents,
    currency: "USD",
    description: input.description,
    merchant_name: input.merchantName ?? null,
    category_id: input.categoryId,
    account_id: input.accountId ?? null,
    transaction_date: input.transactionDate,
    posted_at: nowIso,
    source: "manual" as const,
    external_transaction_id: null,
    recurring_rule_id: null,
    transfer_group_id: input.transferGroupId ?? null,
    parent_transaction_id: input.parentTransactionId ?? null,
    is_excluded_from_budget: input.isExcludedFromBudget,
    user_note: input.userNote ?? null,
  };

  const { data: created, error: insertError } = await supabase
    .from("finance_transactions")
    .insert(insertRow)
    .select(SELECT_COLS)
    .single();

  if (insertError || !created) {
    if (insertError?.code && FINANCE_LEDGER_INFRA_MISSING.has(insertError.code)) {
      // Migration not applied — client keeps local ledger; accept without persisting.
      return NextResponse.json({ deferred: true, transaction: null }, { status: 202 });
    }
    // Unique violation on id → treat as conflict (client must not reuse ids).
    if (insertError?.code === "23505") {
      return NextResponse.json({ error: "Transaction id already exists." }, { status: 409 });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-tx:create:${correlationId}]`, insertError?.message);
    return NextResponse.json(
      { error: "Could not create transaction.", correlationId },
      { status: 500 },
    );
  }

  const transaction = rowToTransaction(created as FinanceTransactionRow);
  const body = { transaction };
  const status = 201;

  // Best-effort idempotency record — if this fails we still return the create.
  await supabase.from("finance_mutation_idempotency").insert({
    user_id: user.id,
    idempotency_key: input.idempotencyKey,
    resource_type: "transaction",
    resource_id: transaction.id,
    response_status: status,
    response_body: body,
  });

  return NextResponse.json(body, { status });
}
