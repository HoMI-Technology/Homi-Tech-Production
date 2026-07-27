import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const schema = z.object({
  score: z.number().finite().min(0).max(100),
  verdict: z.enum(["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"]),
  assessmentAt: z.string().max(40).optional(),
  displayName: z.string().trim().min(1).max(40).optional(),
});

/** POST — push this user's latest score into household_members for dual view */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`household-sync:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
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
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid score payload." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    last_score: parsed.data.score,
    last_verdict: parsed.data.verdict,
    last_assessment_at: parsed.data.assessmentAt ?? new Date().toISOString(),
  };
  if (parsed.data.displayName) patch.display_name = parsed.data.displayName;

  const { error } = await supabase
    .from("household_members")
    .update(patch)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Could not sync score." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
