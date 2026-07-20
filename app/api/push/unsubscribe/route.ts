import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});

/**
 * POST /api/push/unsubscribe — remove the caller's subscription for a given
 * endpoint. RLS scopes the delete to the caller's own rows, so a leaked
 * endpoint can't be used to unsubscribe someone else. Idempotent.
 */
export async function POST(request: Request) {
  const limited = await rateLimit(`push-unsub:${getClientIp(request)}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data.endpoint);

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[push:unsubscribe:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not remove your subscription.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
