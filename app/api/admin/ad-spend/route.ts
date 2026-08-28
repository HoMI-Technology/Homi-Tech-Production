import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { rateLimit } from "@/lib/ratelimit";
import { logAdminAction } from "@/lib/audit";
import type { User } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Admin ad-spend ledger writes (migration 00037). Gated on the session user's
 * profiles.role === "admin" — the same gate the /admin layout renders — then
 * the write goes through the SSR client so the is_admin() RLS policy is the
 * second, database-level guard. Upsert keys on (spend_date, channel, campaign)
 * so re-logging the same day/channel edits in place rather than duplicating.
 */

const upsertSchema = z.object({
  action: z.literal("upsert"),
  spendDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  channel: z.string().trim().min(1).max(60),
  campaign: z.string().trim().max(120).optional().default(""),
  // Dollars from the form → cents. Non-negative, capped to a sane ceiling.
  spendUsd: z.number().min(0).max(10_000_000),
  impressions: z.number().int().min(0).max(1_000_000_000).optional().default(0),
  clicks: z.number().int().min(0).max(1_000_000_000).optional().default(0),
  notes: z.string().trim().max(500).optional(),
});

const deleteSchema = z.object({
  action: z.literal("delete"),
  id: z.string().uuid(),
});

const bodySchema = z.discriminatedUnion("action", [upsertSchema, deleteSchema]);

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  const { allowed } = await rateLimit(`ad-spend:${gate.user.id}`, {
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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ad-spend payload." }, { status: 400 });
  }
  const body = parsed.data;
  const supabase = await createClient();

  if (body.action === "delete") {
    const { error } = await supabase.from("ad_spend").delete().eq("id", body.id);
    if (error) {
      const correlationId = crypto.randomUUID();
      console.error(`[ad-spend:${correlationId}] delete failed`, error);
      return NextResponse.json({ error: "Failed to delete row.", correlationId }, { status: 500 });
    }
    await logAdminAction(supabase, {
      actorId: gate.user.id,
      action: "admin.ad_spend.delete",
      resourceType: "ad_spend",
      resourceId: body.id,
    });
    return NextResponse.json({ ok: true });
  }

  const spend_cents = Math.round(body.spendUsd * 100);
  const row = {
    spend_date: body.spendDate,
    channel: body.channel.toLowerCase(),
    campaign: body.campaign ?? "",
    spend_cents,
    impressions: body.impressions,
    clicks: body.clicks,
    notes: body.notes ?? null,
    created_by: gate.user.id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("ad_spend")
    .upsert(row, { onConflict: "spend_date,channel,campaign" })
    .select("id")
    .maybeSingle();

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[ad-spend:${correlationId}] upsert failed`, error);
    return NextResponse.json({ error: "Failed to save spend.", correlationId }, { status: 500 });
  }

  await logAdminAction(supabase, {
    actorId: gate.user.id,
    action: "admin.ad_spend.upsert",
    resourceType: "ad_spend",
    resourceId: data?.id ?? null,
    metadata: { channel: row.channel, spend_cents, spend_date: row.spend_date },
  });

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}
