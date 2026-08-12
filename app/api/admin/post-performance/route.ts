import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import { logAdminAction } from "@/lib/audit";
import { POST_SNIPPET_LENGTH, type PostPerformanceRow } from "@/lib/admin/marketing-agency";
import type { User } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Post performance ledger (migration 20260812200000).
 *
 * Manual entry, because none of the platforms HōMI publishes to expose per-post
 * numbers through an API on the plans it runs. Rows are written and read through
 * the SSR session client so the post_performance_log_admin_all RLS policy is the
 * second, database-level guard behind the profiles.role gate here.
 *
 * The three metric columns are nullable on purpose: an operator who has
 * impressions but not clicks yet should log the row now rather than wait, and a
 * null must not average as a zero in the summary row.
 */

const MAX_ROWS = 100;

async function requireAdmin(): Promise<{ user: User } | { response: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") {
    return { response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return { user };
}

const insertSchema = z.object({
  platform: z.string().trim().min(1).max(40),
  utm_campaign: z.string().trim().min(1).max(120),
  utm_source: z.string().trim().min(1).max(60),
  post_snippet: z.string().trim().min(1).max(POST_SNIPPET_LENGTH),
  posted_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  impressions: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  clicks: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  completions: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

const SELECT_COLUMNS =
  "id, created_at, platform, utm_campaign, utm_source, post_snippet, posted_at, impressions, clicks, completions, notes";

export async function GET() {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_performance_log")
    .select(SELECT_COLUMNS)
    .order("posted_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[post-performance:${correlationId}] select failed`, error);
    return NextResponse.json({ error: "Failed to load posts.", correlationId }, { status: 500 });
  }

  return NextResponse.json({ rows: (data as PostPerformanceRow[] | null) ?? [] });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  const { allowed } = await rateLimit(`post-performance:${gate.user.id}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = insertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid post-performance payload." }, { status: 400 });
  }
  const body = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_performance_log")
    .insert({
      platform: body.platform,
      utm_campaign: body.utm_campaign,
      utm_source: body.utm_source,
      post_snippet: body.post_snippet,
      posted_at: body.posted_at,
      impressions: body.impressions ?? null,
      clicks: body.clicks ?? null,
      completions: body.completions ?? null,
      notes: body.notes ?? null,
      user_id: gate.user.id,
    })
    .select(SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[post-performance:${correlationId}] insert failed`, error);
    return NextResponse.json({ error: "Failed to log post.", correlationId }, { status: 500 });
  }

  const row = data as PostPerformanceRow | null;
  await logAdminAction(supabase, {
    actorId: gate.user.id,
    action: "admin.post_performance.insert",
    resourceType: "post_performance_log",
    resourceId: row?.id ?? null,
    metadata: { platform: body.platform, utm_campaign: body.utm_campaign },
  });

  return NextResponse.json({ ok: true, row });
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "A row id is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("post_performance_log").delete().eq("id", id);
  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[post-performance:${correlationId}] delete failed`, error);
    return NextResponse.json({ error: "Failed to delete row.", correlationId }, { status: 500 });
  }

  await logAdminAction(supabase, {
    actorId: gate.user.id,
    action: "admin.post_performance.delete",
    resourceType: "post_performance_log",
    resourceId: id,
  });

  return NextResponse.json({ ok: true });
}
