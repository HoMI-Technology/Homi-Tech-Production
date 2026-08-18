import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPlaidCredentials } from "@/lib/plaid/client";
import { redactIdentityForClient } from "@/lib/plaid/identity";
import { getUserEntitlements, requireCapability } from "@/lib/entitlements";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * GET /api/plaid/identity — redacted bank-file identity for the caller.
 * Raw owners are service-role only; this route never returns street, email,
 * or phone.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`plaid-identity:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  if (!getPlaidCredentials()) return NextResponse.json({ configured: false, owners: [] });

  const supabase = await createClient();
  const { userId, entitlements } = await getUserEntitlements(supabase);
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const gate = requireCapability(userId, entitlements, "bankSync");
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Identity is not available right now." }, { status: 503 });
  }

  const { data, error } = await admin
    .from("plaid_account_owners")
    .select("account_id, names, emails, phone_numbers, addresses")
    .eq("user_id", userId);

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[plaid/identity:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not load identity.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({
    configured: true,
    owners: (data ?? []).map((row) => ({
      account_id: row.account_id,
      ...redactIdentityForClient(row),
    })),
  });
}
