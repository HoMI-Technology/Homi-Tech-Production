import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";
import {
  CAMPAIGN_AUDIENCES,
  resolveAudienceRecipients,
  sendCampaignEmails,
} from "@/lib/email/campaign";
import type { Campaign, CampaignSendStatus } from "@/types/database";
import type { User, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Admin broadcast campaigns (Module C). Every handler is gated on the session
 * user's profiles.role === "admin" (the same gate the /admin layout renders),
 * then all campaign tables are touched with the service-role client — they are
 * RLS-locked to service role only (migration 00033).
 */

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

function serviceOr503(): { service: SupabaseClient } | { response: NextResponse } {
  const service = createAdminClient();
  if (!service) {
    return {
      response: NextResponse.json(
        { error: "Supabase service role is not configured." },
        { status: 503 },
      ),
    };
  }
  return { service };
}

const saveSchema = z.object({
  action: z.literal("save"),
  campaignId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(200),
  audience: z.enum(CAMPAIGN_AUDIENCES),
  body: z.string().min(1).max(50_000),
});

const countSchema = z.object({
  action: z.literal("count"),
  audience: z.enum(CAMPAIGN_AUDIENCES),
});

const sendSchema = z.object({
  action: z.literal("send"),
  campaignId: z.string().uuid(),
  /** The sendable count the admin confirmed in the composer. */
  confirmedCount: z.number().int().min(0),
});

const bodySchema = z.discriminatedUnion("action", [saveSchema, countSchema, sendSchema]);

/** Batch ledger writes so a big audience doesn't exceed PostgREST payload limits. */
const LEDGER_CHUNK = 500;

export async function GET() {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;
  const svc = serviceOr503();
  if ("response" in svc) return svc.response;
  const service = svc.service;

  const { data: campaigns, error } = await service
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[campaigns:${correlationId}] list failed`, error);
    return NextResponse.json({ error: "Failed to load campaigns.", correlationId }, { status: 500 });
  }

  const rows = (campaigns as Campaign[] | null) ?? [];
  const counts: Record<string, Record<CampaignSendStatus, number>> = {};

  if (rows.length > 0) {
    const { data: sends } = await service
      .from("campaign_sends")
      .select("campaign_id, status")
      .in("campaign_id", rows.map((c) => c.id));
    for (const row of (sends as { campaign_id: string; status: CampaignSendStatus }[] | null) ?? []) {
      const bucket = (counts[row.campaign_id] ??= { sent: 0, failed: 0, suppressed: 0 });
      bucket[row.status] = (bucket[row.status] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    campaigns: rows.map((c) => ({ ...c, send_counts: counts[c.id] ?? { sent: 0, failed: 0, suppressed: 0 } })),
  });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  const { allowed } = await rateLimit(`campaigns:${gate.user.id}`, { limit: 30, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const svc = serviceOr503();
  if ("response" in svc) return svc.response;
  const service = svc.service;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid campaign payload." }, { status: 400 });
  }
  const body = parsed.data;

  if (body.action === "count") {
    const resolved = await resolveAudienceRecipients(service, body.audience);
    return NextResponse.json({
      audience: body.audience,
      total: resolved.total,
      sendable: resolved.sendable.length,
      suppressed: resolved.suppressed.length,
    });
  }

  if (body.action === "save") {
    const fields = {
      name: body.name,
      subject: body.subject,
      audience: body.audience,
      html_body: body.body,
      updated_at: new Date().toISOString(),
    };

    if (body.campaignId) {
      // Drafts only — a sent campaign is an immutable record of what went out.
      const { data, error } = await service
        .from("campaigns")
        .update(fields)
        .eq("id", body.campaignId)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();
      if (error) {
        const correlationId = crypto.randomUUID();
        console.error(`[campaigns:${correlationId}] update failed`, error);
        return NextResponse.json({ error: "Failed to save campaign.", correlationId }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: "Campaign not found or already sent." }, { status: 409 });
      }
      return NextResponse.json({ ok: true, campaignId: body.campaignId });
    }

    const { data, error } = await service
      .from("campaigns")
      .insert({ ...fields, created_by: gate.user.id })
      .select("id")
      .single();
    if (error || !data) {
      const correlationId = crypto.randomUUID();
      console.error(`[campaigns:${correlationId}] insert failed`, error);
      return NextResponse.json({ error: "Failed to save campaign.", correlationId }, { status: 500 });
    }
    return NextResponse.json({ ok: true, campaignId: data.id });
  }

  // ── action === "send" ──────────────────────────────────────────────────────
  const { data: campaign } = await service
    .from("campaigns")
    .select("*")
    .eq("id", body.campaignId)
    .maybeSingle();
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  // Claim the campaign atomically so a double-click (or two tabs) can't send twice.
  const { data: claimed } = await service
    .from("campaigns")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", body.campaignId)
    .eq("status", "draft")
    .select("id");
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: "Campaign is already sending or sent." }, { status: 409 });
  }

  const revertToDraft = () =>
    service.from("campaigns").update({ status: "draft", updated_at: new Date().toISOString() }).eq("id", body.campaignId);

  const resolved = await resolveAudienceRecipients(service, campaign.audience);

  // The composer confirmed a specific recipient count — if the audience moved
  // since (signups, unsubscribes), refuse and force a fresh confirmation.
  if (resolved.sendable.length !== body.confirmedCount) {
    await revertToDraft();
    return NextResponse.json(
      {
        error: "Audience changed since confirmation. Please re-check the count.",
        sendable: resolved.sendable.length,
        suppressed: resolved.suppressed.length,
      },
      { status: 409 },
    );
  }

  if (!process.env.RESEND_API_KEY) {
    await revertToDraft();
    return NextResponse.json({ error: "Email provider is not configured." }, { status: 503 });
  }

  try {
    // Ledger: suppressed recipients are recorded too — auditable proof the
    // unsubscribe list was honored for this blast.
    const suppressedRows = resolved.suppressed.map((email) => ({
      campaign_id: body.campaignId,
      email,
      status: "suppressed",
    }));
    for (let i = 0; i < suppressedRows.length; i += LEDGER_CHUNK) {
      await service
        .from("campaign_sends")
        .upsert(suppressedRows.slice(i, i + LEDGER_CHUNK), { onConflict: "campaign_id,email", ignoreDuplicates: true });
    }

    const outcome = await sendCampaignEmails({
      recipients: resolved.sendable,
      subject: campaign.subject,
      bodyHtml: campaign.html_body,
    });

    const now = new Date().toISOString();
    const resultRows = [
      ...outcome.sent.map((email) => ({ campaign_id: body.campaignId, email, status: "sent", sent_at: now })),
      ...outcome.failed.map((f) => ({ campaign_id: body.campaignId, email: f.email, status: "failed", error: f.error, sent_at: now })),
    ];
    for (let i = 0; i < resultRows.length; i += LEDGER_CHUNK) {
      await service
        .from("campaign_sends")
        .upsert(resultRows.slice(i, i + LEDGER_CHUNK), { onConflict: "campaign_id,email", ignoreDuplicates: true });
    }

    await service
      .from("campaigns")
      .update({
        status: "sent",
        sent_at: now,
        recipient_count: resolved.sendable.length,
        updated_at: now,
      })
      .eq("id", body.campaignId);

    return NextResponse.json({
      ok: true,
      sent: outcome.sent.length,
      failed: outcome.failed.length,
      suppressed: resolved.suppressed.length,
      recipientCount: resolved.sendable.length,
    });
  } catch (err) {
    const correlationId = crypto.randomUUID();
    console.error(`[campaigns:${correlationId}] send crashed`, err);
    // If anything was already delivered, the campaign is partially sent — keep
    // it out of the draft pool so it can't be re-blasted blindly.
    const { data: sentRows } = await service
      .from("campaign_sends")
      .select("id")
      .eq("campaign_id", body.campaignId)
      .eq("status", "sent")
      .limit(1);
    if (sentRows && sentRows.length > 0) {
      await service
        .from("campaigns")
        .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", body.campaignId);
    } else {
      await revertToDraft();
    }
    return NextResponse.json({ error: "Send interrupted.", correlationId }, { status: 500 });
  }
}
