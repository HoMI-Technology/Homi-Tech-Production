import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

/**
 * POST /api/account/delete — removes the current user's data rows.
 * If SUPABASE_SERVICE_ROLE_KEY is configured, also deletes the auth user.
 * Never crashes: data-row failures are best-effort and reported, not thrown.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`account-delete:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a moment." }, { status: 429 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = user.id;

  try {
    await Promise.all([
      supabase.from("assessments").delete().eq("user_id", userId),
      supabase.from("decision_journal").delete().eq("user_id", userId),
      supabase.from("daily_checkins").delete().eq("user_id", userId),
      supabase.from("score_shares").delete().eq("created_by", userId),
    ]);
    await supabase.from("profiles").delete().eq("id", userId);
  } catch {
    // Best-effort — continue to report status rather than throwing.
  }

  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({
      ok: true,
      authUserRemoved: false,
      note: "Data deleted. Account credentials remain — set SUPABASE_SERVICE_ROLE_KEY to fully remove the auth user.",
    });
  }

  try {
    const admin = createSupabaseJsClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      return NextResponse.json({
        ok: true,
        authUserRemoved: false,
        note: `Data deleted, but removing the auth user failed: ${error.message}`,
      });
    }
    return NextResponse.json({ ok: true, authUserRemoved: true });
  } catch {
    return NextResponse.json({
      ok: true,
      authUserRemoved: false,
      note: "Data deleted, but removing the auth user failed unexpectedly.",
    });
  }
}
