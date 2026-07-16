import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * DELETE /api/shares/[id] — revokes one of the current user's share links.
 * This is a soft revoke (sets revoked_at), not a hard delete: a revocable
 * receipt — distinguishable from one that simply expired — is part of the
 * product's B2B thesis.
 */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`shares-write:${ip}`, { limit: 15, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a moment." }, { status: 429 });
  }

  const { id } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: share, error: fetchError } = await supabase
    .from("score_shares")
    .select("id")
    .eq("id", id)
    .eq("created_by", user.id)
    .maybeSingle();

  if (fetchError || !share) {
    return NextResponse.json({ error: "Share link not found." }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("score_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
