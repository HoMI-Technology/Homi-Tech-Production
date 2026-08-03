import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import {
  FINANCE_LEDGER_INFRA_MISSING,
  rowToCategory,
  type FinanceCategoryRow,
} from "@/lib/finance/db-map";

export const runtime = "nodejs";

/**
 * GET /api/finance/categories — system defaults + the caller's custom categories.
 * Archived rows are included so historical labels still resolve; clients filter.
 */

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-cat-read:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // RLS already restricts to system OR owner; explicit or() keeps the plan clear.
  const { data, error } = await supabase
    .from("finance_categories")
    .select(
      "id, user_id, name, slug, category_type, essentiality, parent_category_id, is_system, is_archived, created_at, updated_at",
    )
    .or(`is_system.eq.true,user_id.eq.${user.id}`)
    .order("slug", { ascending: true });

  if (error) {
    if (error.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
      return NextResponse.json({ categories: [], deferred: true });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-cat:list:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not load categories.", correlationId },
      { status: 500 },
    );
  }

  const categories = ((data ?? []) as FinanceCategoryRow[]).map(rowToCategory);
  return NextResponse.json({ categories });
}
