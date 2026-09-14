import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { applyCategoryRules, type CategoryRule } from "@/lib/finance/categorize";
import { FINANCE_LEDGER_INFRA_MISSING } from "@/lib/finance/db-map";

export const runtime = "nodejs";

const TX_COLS = "id, merchant_name, description";
const MAX_BATCH = 500;

/**
 * POST /api/finance/transactions/categorize — batch-applies the caller's
 * category rules to their UNCATEGORIZED MANUAL transactions.
 *
 * Scope guards:
 *   - manual source only: plaid rows carry provider categories and this
 *     route never rewrites them (rules may still be applied at import time
 *     by the sync path, which owns those rows).
 *   - category_id is null only: an already-categorized row is a user
 *     decision, not a gap.
 *
 * Idempotent: a repeat run finds no matching uncategorized rows and
 * reports { applied: 0 }. Returns counts, never advice.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-categorize-write:${ip}`, {
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

  const [{ data: ruleRows, error: ruleError }, { data: txRows, error: txError }] =
    await Promise.all([
      supabase
        .from("finance_category_rules")
        .select("id, match_type, pattern, category_id, priority")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("priority", { ascending: true }),
      supabase
        .from("finance_transactions")
        .select(TX_COLS)
        .eq("user_id", user.id)
        .eq("source", "manual")
        .is("category_id", null)
        .is("deleted_at", null)
        .order("transaction_date", { ascending: false })
        .limit(MAX_BATCH),
    ]);

  for (const [scope, error] of [
    ["rules", ruleError],
    ["transactions", txError],
  ] as const) {
    if (error) {
      if (error.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
        return NextResponse.json({ deferred: true, applied: 0 }, { status: 202 });
      }
      const correlationId = crypto.randomUUID();
      console.error(`[finance-categorize:${scope}:${correlationId}]`, error.message);
      return NextResponse.json(
        { error: "Could not apply category rules.", correlationId },
        { status: 500 },
      );
    }
  }

  const rules = ((ruleRows ?? []) as {
    id: string;
    match_type: CategoryRule["matchType"];
    pattern: string;
    category_id: string;
    priority: number;
  }[]).map(
    (row): CategoryRule => ({
      id: row.id,
      matchType: row.match_type,
      pattern: row.pattern,
      categoryId: row.category_id,
      priority: row.priority,
    }),
  );

  const candidates = (txRows ?? []) as {
    id: string;
    merchant_name: string | null;
    description: string;
  }[];

  const updates = new Map<string, { categoryId: string; ruleId: string }>();
  for (const tx of candidates) {
    const hit = applyCategoryRules(tx.merchant_name ?? tx.description, rules);
    if (hit) updates.set(tx.id, { categoryId: hit.categoryId, ruleId: hit.id });
  }

  let applied = 0;
  const failures: string[] = [];
  for (const [id, update] of updates) {
    // Re-check category_id IS NULL in the update predicate so a concurrent
    // manual categorization always wins over a stale batch.
    const { error } = await supabase
      .from("finance_transactions")
      .update({ category_id: update.categoryId })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("source", "manual")
      .is("category_id", null)
      .is("deleted_at", null);
    if (error) {
      failures.push(id);
    } else {
      applied += 1;
    }
  }

  if (failures.length > 0) {
    const correlationId = crypto.randomUUID();
    console.error(
      `[finance-categorize:update:${correlationId}]`,
      `${failures.length} rows failed`,
    );
    return NextResponse.json(
      {
        applied,
        failed: failures.length,
        scanned: candidates.length,
        correlationId,
      },
      { status: 207 },
    );
  }

  return NextResponse.json({
    applied,
    failed: 0,
    scanned: candidates.length,
    matched: updates.size,
    rulesUsed: rules.length,
  });
}
