import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { isPushConfigured } from "@/lib/push/config";

export const runtime = "nodejs";

/** Postgres/PostgREST codes meaning migration 00024 isn't applied yet. */
const INFRA_MISSING_CODES = new Set(["42P01", "PGRST205"]);

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

function serverError(scope: string, message: string) {
  const correlationId = crypto.randomUUID();
  console.error(`[push:${scope}:${correlationId}]`, message);
  return NextResponse.json(
    { error: "Could not save your subscription right now.", correlationId },
    { status: 500 },
  );
}

/**
 * POST /api/push/subscribe — persist the caller's Web Push subscription.
 * Idempotent on endpoint (a browser re-subscribing updates its keys). Returns
 * 501 when push isn't configured so the client can hide the opt-in quietly.
 */
export async function POST(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push is not configured." }, { status: 501 });
  }

  const limited = await rateLimit(`push-sub:${getClientIp(request)}`, {
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

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { endpoint, keys } = parsed.data;
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
      last_used_at: new Date().toISOString(),
      failure_count: 0,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    if (INFRA_MISSING_CODES.has(error.code ?? "")) {
      return NextResponse.json({ error: "Push storage not provisioned." }, { status: 503 });
    }
    return serverError("subscribe", error.message);
  }

  return NextResponse.json({ ok: true });
}
