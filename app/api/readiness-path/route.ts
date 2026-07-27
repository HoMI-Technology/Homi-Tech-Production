import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { normalizeReadinessPath } from "@/lib/readiness/path";

export const runtime = "nodejs";

const INFRA_MISSING_CODES = new Set(["42P01", "PGRST205"]);

const pathStepSchema = z.object({
  id: z.string().max(80),
  title: z.string().max(200),
  kind: z.enum(["milestone", "deadline", "review"]),
  daysFromNow: z.number().finite().min(0).max(730),
  reasonCode: z.string().max(64),
  href: z.string().max(200),
  notes: z.string().max(4000),
  fundingTarget: z.number().finite().nullable(),
  fundingLabel: z.string().max(200).nullable(),
  status: z.enum(["pending", "done", "skipped"]).optional(),
  completedAt: z.string().max(40).nullable().optional(),
});

const pathSchema = z.object({
  id: z.string().max(80),
  version: z.literal(1),
  createdAt: z.string().max(40),
  assessmentCompletedAt: z.string().max(40).nullable(),
  verdict: z.enum(["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"]),
  score: z.number().finite().min(0).max(100),
  bindingConstraint: z.string().max(64).nullable(),
  confidence: z.enum(["assessment_only", "assessment_plus_finance"]),
  disclaimer: z.string().max(2000),
  steps: z.array(pathStepSchema).max(12),
  mode: z.enum(["build", "ready_optional"]),
  calendarCommittedAt: z.string().max(40).nullable().optional(),
});

const putSchema = z.object({
  state: pathSchema,
  client_updated_at: z.number().int().min(0).max(4_102_444_800_000),
});

/** GET /api/readiness-path */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`readiness-path-read:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
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

  const { data, error } = await supabase
    .from("user_readiness_path")
    .select("path, client_updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    if (error.code && INFRA_MISSING_CODES.has(error.code)) {
      return NextResponse.json({ state: null });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[readiness-path:get:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not load your path.", correlationId },
      { status: 500 },
    );
  }

  if (!data) return NextResponse.json({ state: null });
  const normalized = normalizeReadinessPath(data.path);
  return NextResponse.json({
    state: normalized,
    client_updated_at: Number(data.client_updated_at),
  });
}

/** PUT /api/readiness-path — LWW upsert */
export async function PUT(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`readiness-path-write:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid path payload." }, { status: 400 });
  }

  const normalized = normalizeReadinessPath(parsed.data.state);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid path shape." }, { status: 400 });
  }

  const clientUpdatedAt = parsed.data.client_updated_at;

  const { data: existing } = await supabase
    .from("user_readiness_path")
    .select("path, client_updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing && Number(existing.client_updated_at) > clientUpdatedAt) {
    return NextResponse.json({
      stale: true,
      state: normalizeReadinessPath(existing.path),
      client_updated_at: Number(existing.client_updated_at),
    });
  }

  const { error } = await supabase.from("user_readiness_path").upsert(
    {
      user_id: user.id,
      path: normalized,
      client_updated_at: clientUpdatedAt,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    if (error.code && INFRA_MISSING_CODES.has(error.code)) {
      // Migration not applied — local-only is fine; accept without persisting.
      return NextResponse.json({ ok: true, persisted: false });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[readiness-path:put:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not save your path.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, persisted: true });
}
