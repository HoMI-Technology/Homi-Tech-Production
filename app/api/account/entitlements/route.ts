import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserEntitlements } from "@/lib/entitlements";
import { readAdvisorUsage } from "@/lib/advisor/usage";

/**
 * GET /api/account/entitlements — current user's capability set (read-only).
 *
 * `?usage=1` additionally returns live message counters, so a surface can show what
 * is left *before* the wall instead of only at it. It is opt-in on purpose: every
 * EntitlementGate on every gated page calls this endpoint on mount, and only the
 * tier banner actually reads usage — making it unconditional would add a second
 * query to page loads that throw the result away.
 *
 * `usage` is null when the counters can't be read (mid-migration, transient error).
 * Callers show the cap alone rather than inventing a number.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { userId, entitlements } = await getUserEntitlements(supabase);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const wantsUsage = request.nextUrl.searchParams.get("usage") === "1";
  const usage = wantsUsage ? await readAdvisorUsage(supabase, entitlements) : null;

  // Counters move with every message, so this must never sit in a shared or
  // heuristic browser cache.
  return NextResponse.json({ entitlements, usage }, { headers: { "cache-control": "no-store" } });
}
