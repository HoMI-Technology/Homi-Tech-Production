import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlaidCredentials } from "@/lib/plaid/client";
import { getUserEntitlements, requireCapability } from "@/lib/entitlements";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * GET /api/plaid/holdings — the caller's investment positions joined to
 * security metadata. RLS owner-select; no identity fields.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`plaid-holdings:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const credentials = getPlaidCredentials();
  if (!credentials) return NextResponse.json({ configured: false, holdings: [] });

  const supabase = await createClient();
  const { userId, entitlements } = await getUserEntitlements(supabase);
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const gate = requireCapability(userId, entitlements, "bankSync");
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { data, error } = await supabase
    .from("plaid_holdings")
    .select(
      "account_id, security_id, quantity, institution_price, institution_value, cost_basis, iso_currency, vested_quantity, vested_value, updated_at",
    )
    .eq("user_id", userId);

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[plaid/holdings:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not load holdings.", correlationId },
      { status: 500 },
    );
  }

  const securityIds = [...new Set((data ?? []).map((row) => row.security_id))];
  const { data: securities } = securityIds.length
    ? await supabase
        .from("plaid_securities")
        .select("security_id, name, ticker_symbol, type, subtype, figi, is_cash_equivalent")
        .in("security_id", securityIds)
    : { data: [] };
  const byId = new Map((securities ?? []).map((row) => [row.security_id, row]));

  return NextResponse.json({
    configured: true,
    holdings: (data ?? []).map((row) => ({
      ...row,
      security: byId.get(row.security_id) ?? null,
    })),
  });
}
