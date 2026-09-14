import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { recurringRuleUpdateSchema } from "@/lib/finance/validation";
import {
  FINANCE_LEDGER_INFRA_MISSING,
  rowToRecurringRule,
  type FinanceRecurringRuleRow,
} from "@/lib/finance/db-map";

export const runtime = "nodejs";

const SELECT_COLS =
  "id, user_id, type, amount_cents, description, category_id, cadence, start_date, next_occurrence_date, end_date, generation_mode, is_active, detection_source, detection_confidence, created_at, updated_at, deleted_at";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/finance/recurring-rules/:id — optimistic concurrency via
 * expectedUpdatedAt (ISO). Stale stamp → 409 with the current row.
 * plaid_detected rules are server-owned; this route edits manual rules only.
 *
 * DELETE /api/finance/recurring-rules/:id — soft delete (sets deleted_at).
 * Hard delete is not exposed; audit trail stays.
 */

export async function PATCH(request: Request, ctx: RouteCtx) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-recurring-rules-write:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid recurring rule id." }, { status: 400 });
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

  const parsed = recurringRuleUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { expectedUpdatedAt, ...fields } = parsed.data;

  const { data: existing, error: readError } = await supabase
    .from("finance_recurring_rules")
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
    console.error(`[finance-recurring-rules:patch-read:${correlationId}]`, readError.message);
    return NextResponse.json(
      { error: "Could not update the recurring rule.", correlationId },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json({ error: "Recurring rule not found." }, { status: 404 });
  }

  const row = existing as FinanceRecurringRuleRow;
  // Optimistic concurrency: client must present the last seen updated_at.
  if (new Date(row.updated_at).getTime() !== new Date(expectedUpdatedAt).getTime()) {
    return NextResponse.json(
      { error: "Stale write.", rule: rowToRecurringRule(row) },
      { status: 409 },
    );
  }

  // Manual rules only from this route; detected rules are server-owned.
  if (row.detection_source !== "manual") {
    return NextResponse.json(
      { error: "Only manual recurring rules can be edited here." },
      { status: 403 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (fields.amountCents !== undefined) patch.amount_cents = fields.amountCents;
  if (fields.description !== undefined) patch.description = fields.description;
  if (fields.categoryId !== undefined) patch.category_id = fields.categoryId;
  if (fields.cadence !== undefined) patch.cadence = fields.cadence;
  if (fields.nextOccurrenceDate !== undefined) {
    patch.next_occurrence_date = fields.nextOccurrenceDate;
  }
  if (fields.endDate !== undefined) patch.end_date = fields.endDate;
  if (fields.generationMode !== undefined) patch.generation_mode = fields.generationMode;
  if (fields.isActive !== undefined) patch.is_active = fields.isActive;

  // The date check must hold against the post-patch end date.
  const nextEndDate = fields.endDate !== undefined ? fields.endDate : row.end_date;
  if (nextEndDate !== null && nextEndDate < row.start_date) {
    return NextResponse.json(
      { error: "End date must not precede the start date." },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("finance_recurring_rules")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select(SELECT_COLS)
    .single();

  if (updateError || !updated) {
    const correlationId = crypto.randomUUID();
    console.error(`[finance-recurring-rules:patch:${correlationId}]`, updateError?.message);
    return NextResponse.json(
      { error: "Could not update the recurring rule.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({
    rule: rowToRecurringRule(updated as FinanceRecurringRuleRow),
  });
}

export async function DELETE(request: Request, ctx: RouteCtx) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-recurring-rules-write:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid recurring rule id." }, { status: 400 });
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
    .from("finance_recurring_rules")
    .update({ deleted_at: nowIso, is_active: false })
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
    console.error(`[finance-recurring-rules:delete:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not delete the recurring rule.", correlationId },
      { status: 500 },
    );
  }

  if (!updated) {
    // Idempotent: already gone counts as success.
    return NextResponse.json({ ok: true, alreadyDeleted: true });
  }

  return NextResponse.json({
    ok: true,
    rule: rowToRecurringRule(updated as FinanceRecurringRuleRow),
  });
}
