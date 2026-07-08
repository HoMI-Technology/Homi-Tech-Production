import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;

const bodySchema = z.object({
  assessmentId: z.string().uuid(),
  acknowledgedHardStops: z.boolean(),
});

/**
 * POST /api/assessments/override
 * Records that the signed-in user chose to proceed ("I'm deciding anyway")
 * despite the verdict, and schedules day30/day90/day365 outcome surveys.
 * Never recomputes or touches score/verdict — this is additive only.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`assessments-override:${ip}`, { limit: 10, windowMs: 60_000 });
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const { assessmentId, acknowledgedHardStops } = parsed.data;

  const { data: assessment, error: fetchError } = await supabase
    .from("assessments")
    .select("id")
    .eq("id", assessmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !assessment) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  const at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("assessments")
    .update({ user_override: { at, acknowledged_hard_stops: acknowledgedHardStops } })
    .eq("id", assessmentId)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Guard against duplicate pending surveys if this assessment is overridden more than once.
  await supabase
    .from("outcome_surveys")
    .delete()
    .eq("assessment_id", assessmentId)
    .eq("user_id", user.id)
    .is("completed_at", null);

  const now = Date.now();
  const surveys = [
    { kind: "day30", days: 30 },
    { kind: "day90", days: 90 },
    { kind: "day365", days: 365 },
  ].map(({ kind, days }) => ({
    user_id: user.id,
    assessment_id: assessmentId,
    due_at: new Date(now + days * DAY_MS).toISOString(),
    kind,
  }));

  const { error: insertError } = await supabase.from("outcome_surveys").insert(surveys);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true, at });
}
