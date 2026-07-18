import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { loadCompanionThread, forgetCompanionThread } from "@/lib/advisor/memory";

export const runtime = "nodejs";

/**
 * The Companion's server-side memory: returns the signed-in user's thread
 * (conversation id + recent messages, chronological) so every surface and
 * every device resumes the same conversation. Anonymous → 401; the client
 * falls back to its local copy. RLS scopes all reads to the session's user.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`advisor-history:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to load your Companion history.", code: "auth_required" }, { status: 401 });
  }

  const thread = await loadCompanionThread(supabase);
  return NextResponse.json(thread ?? { conversationId: null, messages: [] });
}

/**
 * "Forget this conversation" — removes the user's server-side Companion
 * thread entirely (messages cascade). User-initiated only, from the
 * "what HōMI remembers" panel. Honest result: 500 if the delete failed,
 * never a fake success.
 */
export async function DELETE(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`advisor-forget:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first.", code: "auth_required" }, { status: 401 });
  }

  const forgotten = await forgetCompanionThread(supabase, user.id);
  if (!forgotten) {
    return NextResponse.json({ error: "Couldn't forget the conversation. Try again." }, { status: 500 });
  }
  return NextResponse.json({ forgotten: true });
}
