import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

/** GET /api/account/export — downloads all of the current user's data as a JSON attachment. */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`account-export:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a moment." },
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

  const [profile, assessments, journal, checkins] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("assessments").select("*").eq("user_id", user.id),
    supabase.from("decision_journal").select("*").eq("user_id", user.id),
    supabase.from("daily_checkins").select("*").eq("user_id", user.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    profile: profile.data ?? null,
    assessments: assessments.data ?? [],
    decision_journal: journal.data ?? [],
    daily_checkins: checkins.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="homi-data-export.json"',
    },
  });
}
