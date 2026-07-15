import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Postgres/PostgREST codes meaning "migration 00018 isn't applied yet". */
const INFRA_MISSING_CODES = new Set([
  "42P01", // undefined_table
  "PGRST205", // PostgREST: table not found in schema cache
]);

/**
 * The down-payment goal is the only kind Session 3 ships. The routes below
 * hard-code it so a client can never write an unexpected kind; when new kinds
 * land, the body schema grows a `kind` enum alongside the check constraint.
 */
const GOAL_KIND = "down_payment";

const upsertSchema = z.object({
  label: z.string().trim().max(80).nullish(),
  target_amount: z.number().finite().positive().max(100_000_000),
  target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
});

function serverError(scope: string, message: string) {
  const correlationId = crypto.randomUUID();
  console.error(`[goals:${scope}:${correlationId}]`, message);
  return NextResponse.json(
    { error: "Could not save your goal right now.", correlationId },
    { status: 500 },
  );
}

/** GET /api/goals — the caller's down-payment goal, or null when unset. */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`goals-read:${ip}`, { limit: 30, windowMs: 60_000 });
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

  const { data, error } = await supabase
    .from("goals")
    .select("id, kind, label, target_amount, target_date, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("kind", GOAL_KIND)
    .maybeSingle();

  if (error) {
    if (error.code && INFRA_MISSING_CODES.has(error.code)) {
      // Table not migrated yet — report honestly empty instead of erroring.
      return NextResponse.json({ goal: null });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[goals:get:${correlationId}]`, error.message);
    return NextResponse.json({ error: "Could not load your goal.", correlationId }, { status: 500 });
  }

  return NextResponse.json({ goal: data ?? null });
}

/** PUT /api/goals — creates or replaces the caller's down-payment goal. */
export async function PUT(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`goals-write:${ip}`, { limit: 20, windowMs: 60_000 });
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
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A target amount greater than zero is required." },
      { status: 400 },
    );
  }

  // Ownership is structural: user_id comes from the session, never the body,
  // and RLS (00018) enforces the same rule in the database as defense-in-depth.
  const { data, error } = await supabase
    .from("goals")
    .upsert(
      {
        user_id: user.id,
        kind: GOAL_KIND,
        label: parsed.data.label ?? null,
        target_amount: parsed.data.target_amount,
        target_date: parsed.data.target_date ?? null,
      },
      { onConflict: "user_id,kind" },
    )
    .select("id, kind, label, target_amount, target_date, created_at, updated_at")
    .single();

  if (error || !data) {
    return serverError("put", error?.message ?? "upsert returned no row");
  }

  return NextResponse.json({ goal: data });
}

/** DELETE /api/goals — removes the caller's down-payment goal. Idempotent. */
export async function DELETE(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`goals-write:${ip}`, { limit: 20, windowMs: 60_000 });
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

  const { error } = await supabase.from("goals").delete().eq("user_id", user.id).eq("kind", GOAL_KIND);

  if (error && !(error.code && INFRA_MISSING_CODES.has(error.code))) {
    const correlationId = crypto.randomUUID();
    console.error(`[goals:delete:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not remove your goal right now.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
