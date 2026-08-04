import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { buildFinanceContextFromLedgerTables } from "@/lib/advisor/finance-context";

export const runtime = "nodejs";

/**
 * GET /api/advisor/finance
 *
 * Returns the user's live ledger-derived finance context for agents.
 * Authenticated only; falls back to { context: null, source: "none" } when
 * no server ledger rows exist. The client owns its local ledger state.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`advisor-finance:${ip}`, {
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
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await buildFinanceContextFromLedgerTables(supabase);

  return NextResponse.json({
    context,
    source: context ? "server" : "none",
    generatedAt: new Date().toISOString(),
  });
}
