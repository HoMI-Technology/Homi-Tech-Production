import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/** POST /api/shares — creates a 30-day score-share link for one of the current user's assessments. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let assessmentId: string | undefined;
  try {
    const body = (await request.json()) as { assessmentId?: string };
    assessmentId = body.assessmentId;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!assessmentId) {
    return NextResponse.json({ error: "assessmentId is required." }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("score_shares")
    .insert({
      assessment_id: assessmentId,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select("share_token")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not create a share link." }, { status: 500 });
  }

  return NextResponse.json({ url: `${env.NEXT_PUBLIC_SITE_URL}/share/${data.share_token}` });
}
