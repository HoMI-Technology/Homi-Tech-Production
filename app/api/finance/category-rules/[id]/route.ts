import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { categoryRuleUpdateSchema } from "@/lib/finance/validation";
import { normalizePayee } from "@/lib/finance/categorize";
import { FINANCE_LEDGER_INFRA_MISSING } from "@/lib/finance/db-map";

export const runtime = "nodejs";

const SELECT_COLS =
  "id, user_id, match_type, pattern, category_id, priority, created_at, updated_at, deleted_at";

type RouteCtx = { params: Promise<{ id: string }> };

interface FinanceCategoryRuleRow {
  id: string;
  user_id: string;
  match_type: "payee_exact" | "payee_contains";
  pattern: string;
  category_id: string;
  priority: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function rowToRule(row: FinanceCategoryRuleRow) {
  return {
    id: row.id,
    userId: row.user_id,
    matchType: row.match_type,
    pattern: row.pattern,
    categoryId: row.category_id,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/**
 * PATCH /api/finance/category-rules/:id — optimistic concurrency via
 * expectedUpdatedAt (409 on stale). Re-normalizes pattern on change.
 *
 * DELETE /api/finance/category-rules/:id — soft delete; idempotent
 * (already-deleted returns ok with alreadyDeleted).
 */
export async function PATCH(request: Request, ctx: RouteCtx) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-category-rules-write:${ip}`, {
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
    return NextResponse.json({ error: "Invalid category rule id." }, { status: 400 });
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

  const parsed = categoryRuleUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { expectedUpdatedAt, ...fields } = parsed.data;

  const { data: existing, error: readError } = await supabase
    .from("finance_category_rules")
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
    console.error(`[finance-category-rules:patch-read:${correlationId}]`, readError.message);
    return NextResponse.json(
      { error: "Could not update the category rule.", correlationId },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json({ error: "Category rule not found." }, { status: 404 });
  }

  const row = existing as FinanceCategoryRuleRow;
  if (new Date(row.updated_at).getTime() !== new Date(expectedUpdatedAt).getTime()) {
    return NextResponse.json(
      { error: "Stale write.", rule: rowToRule(row) },
      { status: 409 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (fields.matchType !== undefined) patch.match_type = fields.matchType;
  if (fields.pattern !== undefined) {
    const pattern = normalizePayee(fields.pattern);
    if (pattern === "") {
      return NextResponse.json({ error: "Pattern must not be blank." }, { status: 400 });
    }
    patch.pattern = pattern;
  }
  if (fields.categoryId !== undefined) {
    const { data: category, error: categoryError } = await supabase
      .from("finance_categories")
      .select("id")
      .eq("id", fields.categoryId)
      .maybeSingle();
    if (categoryError) {
      const correlationId = crypto.randomUUID();
      console.error(`[finance-category-rules:patch-category:${correlationId}]`, categoryError.message);
      return NextResponse.json(
        { error: "Could not update the category rule.", correlationId },
        { status: 500 },
      );
    }
    if (!category) {
      return NextResponse.json({ error: "Unknown category." }, { status: 400 });
    }
    patch.category_id = fields.categoryId;
  }
  if (fields.priority !== undefined) patch.priority = fields.priority;

  const { data: updated, error: updateError } = await supabase
    .from("finance_category_rules")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select(SELECT_COLS)
    .single();

  if (updateError || !updated) {
    if (updateError?.code === "23505") {
      return NextResponse.json(
        { error: "A rule with that match type and pattern already exists." },
        { status: 409 },
      );
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-category-rules:patch:${correlationId}]`, updateError?.message);
    return NextResponse.json(
      { error: "Could not update the category rule.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({ rule: rowToRule(updated as FinanceCategoryRuleRow) });
}

export async function DELETE(request: Request, ctx: RouteCtx) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-category-rules-write:${ip}`, {
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
    return NextResponse.json({ error: "Invalid category rule id." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: updated, error } = await supabase
    .from("finance_category_rules")
    .update({ deleted_at: new Date().toISOString() })
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
    console.error(`[finance-category-rules:delete:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not delete the category rule.", correlationId },
      { status: 500 },
    );
  }

  if (!updated) {
    return NextResponse.json({ ok: true, alreadyDeleted: true });
  }

  return NextResponse.json({ ok: true, rule: rowToRule(updated as FinanceCategoryRuleRow) });
}
