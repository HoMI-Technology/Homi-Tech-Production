import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlaidCredentials } from "@/lib/plaid/client";
import { getUserEntitlements, requireCapability } from "@/lib/entitlements";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** GET /api/plaid/liabilities — credit / student / mortgage details for the caller. */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`plaid-liabilities:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  if (!getPlaidCredentials()) return NextResponse.json({ configured: false, liabilities: [] });

  const supabase = await createClient();
  const { userId, entitlements } = await getUserEntitlements(supabase);
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const gate = requireCapability(userId, entitlements, "bankSync");
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { data, error } = await supabase
    .from("plaid_liabilities")
    .select("account_id, kind, payload, updated_at")
    .eq("user_id", userId);

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[plaid/liabilities:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not load liabilities.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({ configured: true, liabilities: data ?? [] });
}
