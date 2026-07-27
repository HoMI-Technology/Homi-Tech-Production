import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { getVerifiedCashFlow } from "@/lib/plaid/cashflow";
import {
  getCategoryIntelligence,
  categorySignalsForPath,
} from "@/lib/plaid/categories";

export const runtime = "nodejs";

/**
 * GET /api/plaid/cashflow-summary
 * Signed-in VERIFIED 30d cashflow for Path confidence chrome.
 * Returns null summary when unlinked / empty — not an error.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`plaid-cashflow-summary:${ip}`, {
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

  try {
    const summary = await getVerifiedCashFlow(supabase);
    const categories = await getCategoryIntelligence(supabase);
    const signals = categorySignalsForPath(categories);
    return NextResponse.json({
      verified: summary,
      categories: categories
        ? {
            windowDays: categories.windowDays,
            topOutflowCategories: categories.topOutflowCategories,
            subscriptionDragMonthly: categories.subscriptionDragMonthly,
            recurring: categories.recurring
              .filter((r) => r.subscriptionLike)
              .slice(0, 15)
              .map((r) => ({
                name: r.name,
                category: r.category,
                amount: r.amount,
                monthlyEstimate: r.monthlyEstimate,
                count: r.count,
              })),
            notes: signals.notes,
          }
        : null,
      source: summary || categories ? "plaid_transactions" : null,
    });
  } catch {
    return NextResponse.json({ verified: null, categories: null, source: null });
  }
}
