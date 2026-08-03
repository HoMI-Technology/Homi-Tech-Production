import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { transactionUpdateSchema } from "@/lib/finance/validation";
import {
  FINANCE_LEDGER_INFRA_MISSING,
  rowToTransaction,
  type FinanceTransactionRow,
} from "@/lib/finance/db-map";

export const runtime = "nodejs";

const SELECT_COLS =
  "id, user_id, type, status, amount_cents, currency, description, merchant_name, category_id, account_id, transaction_date, posted_at, source, external_transaction_id, recurring_rule_id, transfer_group_id, parent_transaction_id, is_excluded_from_budget, user_note, created_at, updated_at, deleted_at";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/finance/transactions/:id — optimistic concurrency via
 * expectedUpdatedAt (ISO). Stale stamp → 409 with the current row.
 *
 * DELETE /api/finance/transactions/:id — soft delete (sets deleted_at).
 * Hard delete is not exposed; audit trail stays.
 */

export async function PATCH(request: Request, ctx: RouteCtx) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-tx-write:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid transaction id." }, { status: 400 });
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

  const parsed = transactionUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { expectedUpdatedAt, ...fields } = parsed.data;

  const { data: existing, error: readError } = await supabase
    .from("finance_transactions")
    .select(SELECT_COLS)
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (readError) {
    if (readError.code && FINANCE_LEDGER_INFRA_MISSING.has(readError.code)) {
      return NextResponse.json({ deferred: true }, { status: 202 });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-tx:patch-read:${correlationId}]`, readError.message);
    return NextResponse.json(
      { error: "Could not update transaction.", correlationId },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  const row = existing as FinanceTransactionRow;
  // Optimistic concurrency: client must present the last seen updated_at.
  if (new Date(row.updated_at).getTime() !== new Date(expectedUpdatedAt).getTime()) {
    return NextResponse.json(
      { error: "Stale write.", transaction: rowToTransaction(row) },
      { status: 409 },
    );
  }

  // Manual rows only from this route; imported sources are server-owned (PR 6).
  if (row.source !== "manual") {
    return NextResponse.json(
      { error: "Only manual transactions can be edited here." },
      { status: 403 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (fields.amountCents !== undefined) patch.amount_cents = fields.amountCents;
  if (fields.description !== undefined) patch.description = fields.description;
  if (fields.merchantName !== undefined) patch.merchant_name = fields.merchantName;
  if (fields.categoryId !== undefined) patch.category_id = fields.categoryId;
  if (fields.transactionDate !== undefined) patch.transaction_date = fields.transactionDate;
  if (fields.isExcludedFromBudget !== undefined) {
    patch.is_excluded_from_budget = fields.isExcludedFromBudget;
  }
  if (fields.userNote !== undefined) patch.user_note = fields.userNote;

  // Re-validate expense/transfer category rules against the post-patch type.
  const nextType = row.type;
  const nextCategory =
    fields.categoryId !== undefined ? fields.categoryId : row.category_id;
  if (nextType === "expense" && nextCategory === null) {
    return NextResponse.json(
      { error: "Expense transactions require a category." },
      { status: 400 },
    );
  }
  if (nextType === "transfer" && nextCategory !== null) {
    return NextResponse.json(
      { error: "Transfers are not categorized spending." },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("finance_transactions")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select(SELECT_COLS)
    .single();

  if (updateError || !updated) {
    const correlationId = crypto.randomUUID();
    console.error(`[finance-tx:patch:${correlationId}]`, updateError?.message);
    return NextResponse.json(
      { error: "Could not update transaction.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({
    transaction: rowToTransaction(updated as FinanceTransactionRow),
  });
}

export async function DELETE(request: Request, ctx: RouteCtx) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-tx-write:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid transaction id." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("finance_transactions")
    .update({ deleted_at: nowIso, status: "voided" })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select(SELECT_COLS)
    .maybeSingle();

  if (error) {
    if (error.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
      return NextResponse.json({ deferred: true }, { status: 202 });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-tx:delete:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not delete transaction.", correlationId },
      { status: 500 },
    );
  }

  if (!updated) {
    // Idempotent: already gone counts as success.
    return NextResponse.json({ ok: true, alreadyDeleted: true });
  }

  return NextResponse.json({
    ok: true,
    transaction: rowToTransaction(updated as FinanceTransactionRow),
  });
}
