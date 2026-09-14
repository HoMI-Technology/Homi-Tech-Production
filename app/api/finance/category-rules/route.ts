import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { categoryRuleCreateSchema } from "@/lib/finance/validation";
import { normalizePayee, suggestRulesFromHistory } from "@/lib/finance/categorize";
import {
  FINANCE_LEDGER_INFRA_MISSING,
  rowToTransaction,
  type FinanceTransactionRow,
} from "@/lib/finance/db-map";

export const runtime = "nodejs";

const SELECT_COLS =
  "id, user_id, match_type, pattern, category_id, priority, created_at, updated_at, deleted_at";
const TX_COLS =
  "id, user_id, type, status, amount_cents, currency, description, merchant_name, category_id, account_id, transaction_date, posted_at, source, external_transaction_id, recurring_rule_id, transfer_group_id, parent_transaction_id, is_excluded_from_budget, user_note, created_at, updated_at, deleted_at";

const MAX_RULES = 200;
const MAX_HISTORY = 5_000;

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

function serverError(scope: string, message: string | undefined) {
  const correlationId = crypto.randomUUID();
  console.error(`[finance-category-rules:${scope}:${correlationId}]`, message);
  return NextResponse.json(
    { error: "Could not save the category rule right now.", correlationId },
    { status: 500 },
  );
}

/**
 * GET /api/finance/category-rules — the caller's live rules, evaluation
 * order (priority asc, exact before contains). With `?suggestions=true`,
 * also derives candidate rules from the caller's own manual categorization
 * history (≥3 identical filings; conflicts disclosed, never auto-created).
 *
 * POST /api/finance/category-rules — create a rule. Idempotent by the
 * (user, match_type, pattern) unique index: a repeat create returns the
 * existing rule with 200 instead of duplicating.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-category-rules-read:${ip}`, {
    limit: 60,
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

  const { data, error } = await supabase
    .from("finance_category_rules")
    .select(SELECT_COLS)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("priority", { ascending: true })
    .limit(MAX_RULES);

  if (error) {
    if (error.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
      return NextResponse.json({ rules: [], deferred: true });
    }
    return serverError("list", error.message);
  }

  const rules = ((data ?? []) as FinanceCategoryRuleRow[]).map(rowToRule);

  const url = new URL(request.url);
  if (url.searchParams.get("suggestions") !== "true") {
    return NextResponse.json({ rules });
  }

  // Suggestions read the caller's own categorized manual history.
  const { data: txRows, error: txError } = await supabase
    .from("finance_transactions")
    .select(TX_COLS)
    .eq("user_id", user.id)
    .eq("source", "manual")
    .not("category_id", "is", null)
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false })
    .limit(MAX_HISTORY);

  if (txError) {
    if (txError.code && FINANCE_LEDGER_INFRA_MISSING.has(txError.code)) {
      return NextResponse.json({ rules, suggestions: [], conflicts: [], deferred: true });
    }
    return serverError("suggest-read", txError.message);
  }

  const transactions = ((txRows ?? []) as FinanceTransactionRow[]).map(rowToTransaction);
  const existingKeys = new Set(rules.map((r) => `${r.matchType}:${r.pattern}`));
  const { suggestions, conflicts } = suggestRulesFromHistory(transactions);

  return NextResponse.json({
    rules,
    // Drop suggestions that duplicate an existing rule.
    suggestions: suggestions.filter(
      (s) => !existingKeys.has(`${s.matchType}:${s.pattern}`),
    ),
    conflicts,
  });
}

export async function POST(request: Request) {
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

  const parsed = categoryRuleCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid category rule.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const pattern = normalizePayee(input.pattern);
  if (pattern === "") {
    return NextResponse.json({ error: "Pattern must not be blank." }, { status: 400 });
  }

  // The rule's category must be one of the caller's (or a system default).
  const { data: category, error: categoryError } = await supabase
    .from("finance_categories")
    .select("id")
    .eq("id", input.categoryId)
    .maybeSingle();
  if (categoryError) {
    return serverError("category-check", categoryError.message);
  }
  if (!category) {
    return NextResponse.json({ error: "Unknown category." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("finance_category_rules")
    .insert({
      user_id: user.id,
      match_type: input.matchType,
      pattern,
      category_id: input.categoryId,
      priority: input.priority,
    })
    .select(SELECT_COLS)
    .single();

  if (error) {
    if (error.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
      return NextResponse.json({ deferred: true, rule: null }, { status: 202 });
    }
    // Idempotent create: the live (user, match_type, pattern) row exists.
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("finance_category_rules")
        .select(SELECT_COLS)
        .eq("user_id", user.id)
        .eq("match_type", input.matchType)
        .eq("pattern", pattern)
        .is("deleted_at", null)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(
          { rule: rowToRule(existing as FinanceCategoryRuleRow), alreadyExists: true },
          { status: 200 },
        );
      }
      return NextResponse.json({ error: "Rule already exists." }, { status: 409 });
    }
    return serverError("create", error.message);
  }

  return NextResponse.json(
    { rule: rowToRule(data as FinanceCategoryRuleRow) },
    { status: 201 },
  );
}
