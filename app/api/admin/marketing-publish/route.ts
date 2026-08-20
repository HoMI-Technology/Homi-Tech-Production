import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { isPublishable } from "@/lib/admin/agency-approvals";
import { isValidWebhookUrl } from "@/lib/admin/marketing-agency";
import type { User } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

const bodySchema = z.object({
  assetId: z.string().uuid(),
  webhookUrl: z.string().url().max(2000),
  target: z.enum(["buffer", "make"]).optional().default("buffer"),
});

/**
 * Server-gated publish: only `approved` assets may hit an external webhook.
 * Webhook URL is passed from the client (localStorage bearer) — not stored here.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  const { allowed } = await rateLimit(
    `marketing-publish:${getClientIp(request)}:${gate.user.id}`,
    { limit: 20, windowMs: 60_000 },
  );
  if (!allowed) {
    return NextResponse.json({ error: "Too many publish attempts." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!isValidWebhookUrl(parsed.data.webhookUrl)) {
    return NextResponse.json({ error: "Webhook URL must be https." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: asset, error: loadErr } = await supabase
    .from("marketing_assets")
    .select("*")
    .eq("id", parsed.data.assetId)
    .maybeSingle();

  if (loadErr || !asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  if (!isPublishable(asset.status as string)) {
    return NextResponse.json(
      {
        error: `Refuse to publish: status is "${asset.status}", not "approved". CEO must approve first.`,
      },
      { status: 403 },
    );
  }

  const meta = (asset.meta as Record<string, unknown>) ?? {};
  const hashtags = Array.isArray(meta.hashtags)
    ? meta.hashtags.filter((t): t is string => typeof t === "string")
    : [];
  const payload = {
    source: "homi-agency-os",
    asset_id: asset.id,
    platform: asset.platform ?? "x",
    text: asset.body,
    title: asset.title,
    hashtags,
    utm_link: typeof meta.utm_link === "string" ? meta.utm_link : "",
    utm_campaign: typeof meta.utm_campaign === "string" ? meta.utm_campaign : "",
    claim_law_rev: asset.claim_law_rev,
    approved_by: asset.approved_by,
    approved_at: asset.approved_at,
  };

  let publishStatus = 0;
  try {
    const res = await fetch(parsed.data.webhookUrl.trim(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    publishStatus = res.status;
    if (!res.ok) {
      return NextResponse.json(
        { error: `Webhook returned ${res.status}.`, publish_status: res.status },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("[marketing-publish] webhook failed", err);
    return NextResponse.json({ error: "Webhook unreachable." }, { status: 502 });
  }

  const { data: updated, error: updErr } = await supabase
    .from("marketing_assets")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      publish_target: parsed.data.target,
      publish_status: publishStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", asset.id)
    .eq("status", "approved") // optimistic: only if still approved
    .select("*")
    .maybeSingle();

  if (updErr || !updated) {
    console.error("[marketing-publish] status update failed", updErr);
    return NextResponse.json(
      {
        error: "Webhook sent but ledger update failed — check asset status manually.",
        publish_status: publishStatus,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ asset: updated, publish_status: publishStatus });
}
