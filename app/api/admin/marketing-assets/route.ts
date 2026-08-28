import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { CLAIM_LAW_REV, canTransition, type AssetStatus } from "@/lib/admin/agency-approvals";
import { stripNeverSay } from "@/lib/admin/marketing-agency";
import type { User } from "@supabase/supabase-js";

export const runtime = "nodejs";

const createSchema = z.object({
  kind: z.enum([
    "post",
    "caption",
    "image_brief",
    "drip_step",
    "brief",
    "week_slot",
    "insight",
    "analytics",
    "competitor_derived",
  ]),
  platform: z.string().trim().max(40).optional().nullable(),
  title: z.string().trim().max(200).optional().default(""),
  body: z.string().trim().max(12000),
  meta: z.record(z.string(), z.unknown()).optional().default({}),
  source: z.enum(["model", "template", "human", "cron"]).optional().default("human"),
  model: z.string().trim().max(80).optional().nullable(),
  flagged: z.array(z.string().max(80)).max(40).optional().default([]),
  agent_id: z.string().trim().max(40).optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "in_review", "approved", "published", "rejected"]),
  body: z.string().trim().max(12000).optional(),
  title: z.string().trim().max(200).optional(),
  rejected_reason: z.string().trim().max(500).optional().nullable(),
  confirm_second: z.boolean().optional(),
});

/** GET — list pending queue (draft + in_review) and optional status filter. */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  const supabase = await createClient();
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "40")));

  let q = supabase
    .from("marketing_assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status === "pending") {
    q = q.in("status", ["draft", "in_review"]);
  } else if (status) {
    q = q.eq("status", status);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[marketing-assets:list]", error);
    return NextResponse.json({ error: "Failed to list assets." }, { status: 500 });
  }
  return NextResponse.json({ assets: data ?? [] });
}

/** POST — create a draft asset (human or desk). */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  const { allowed } = await rateLimit(
    `marketing-assets:${getClientIp(request)}:${gate.user.id}`,
    { limit: 40, windowMs: 60_000 },
  );
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body.", details: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
  const stripped = stripNeverSay(body.body);
  if (!stripped.clean.trim() && body.body.trim()) {
    return NextResponse.json(
      { error: "Body failed claim-law strip — rewrite without prohibited phrases." },
      { status: 422 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_assets")
    .insert({
      kind: body.kind,
      status: "draft",
      platform: body.platform ?? null,
      title: body.title || body.kind,
      body: stripped.clean,
      meta: body.meta,
      source: body.source,
      model: body.model ?? null,
      flagged: [...new Set([...(body.flagged ?? []), ...stripped.flagged])],
      claim_law_rev: CLAIM_LAW_REV,
      agent_id: body.agent_id ?? null,
      created_by: gate.user.id,
      parent_id: body.parent_id ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[marketing-assets:create]", error);
    return NextResponse.json({ error: "Failed to create asset." }, { status: 500 });
  }
  return NextResponse.json({ asset: data }, { status: 201 });
}

/** PATCH — status transition (approve / reject / etc.). */
export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  const { allowed } = await rateLimit(
    `marketing-assets-patch:${getClientIp(request)}:${gate.user.id}`,
    { limit: 60, windowMs: 60_000 },
  );
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: existing, error: loadErr } = await supabase
    .from("marketing_assets")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (loadErr || !existing) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const from = existing.status as AssetStatus;
  const to = parsed.data.status as AssetStatus;
  if (!canTransition(from, to)) {
    return NextResponse.json(
      { error: `Cannot transition ${from} → ${to}.` },
      { status: 409 },
    );
  }

  // Never allow publish via PATCH — must use marketing-publish route.
  if (to === "published") {
    return NextResponse.json(
      { error: "Use /api/admin/marketing-publish to publish approved assets." },
      { status: 400 },
    );
  }

  let nextBody = parsed.data.body ?? (existing.body as string);
  let nextFlagged = (existing.flagged as string[]) ?? [];
  if (parsed.data.body !== undefined) {
    const stripped = stripNeverSay(parsed.data.body);
    if (!stripped.clean.trim() && parsed.data.body.trim()) {
      return NextResponse.json({ error: "Body failed claim-law strip." }, { status: 422 });
    }
    nextBody = stripped.clean;
    nextFlagged = stripped.flagged;
  }

  if (to === "approved") {
    // Re-strip on approve — fail closed.
    const stripped = stripNeverSay(nextBody);
    if (!stripped.clean.trim() && nextBody.trim()) {
      return NextResponse.json(
        { error: "Cannot approve: claim-law strip emptied the body." },
        { status: 422 },
      );
    }
    nextBody = stripped.clean;
    nextFlagged = [...new Set([...nextFlagged, ...stripped.flagged])];

    const needsSecond =
      existing.kind === "competitor_derived" || nextFlagged.length > 0;
    if (needsSecond && !parsed.data.confirm_second) {
      return NextResponse.json(
        {
          error: "Second confirmation required (claim flags or competitor-derived).",
          requires_second_confirm: true,
          flagged: nextFlagged,
        },
        { status: 409 },
      );
    }
  }

  const patch: Record<string, unknown> = {
    status: to,
    body: nextBody,
    flagged: nextFlagged,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (to === "approved") {
    patch.approved_by = gate.user.id;
    patch.approved_at = new Date().toISOString();
    patch.rejected_reason = null;
  }
  if (to === "rejected") {
    patch.rejected_reason = parsed.data.rejected_reason ?? "Rejected by CEO";
    patch.approved_by = null;
    patch.approved_at = null;
  }
  if (to === "draft") {
    patch.approved_by = null;
    patch.approved_at = null;
    patch.rejected_reason = null;
  }

  const { data, error } = await supabase
    .from("marketing_assets")
    .update(patch)
    .eq("id", parsed.data.id)
    .select("*")
    .single();

  if (error) {
    console.error("[marketing-assets:patch]", error);
    return NextResponse.json({ error: "Failed to update asset." }, { status: 500 });
  }
  return NextResponse.json({ asset: data });
}
