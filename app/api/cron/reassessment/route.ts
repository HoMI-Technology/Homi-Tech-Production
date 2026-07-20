import { NextResponse } from "next/server";
import { safeSecretEquals } from "@/lib/security";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendTemplateEmail } from "@/lib/email/send";
import { daysSinceAssessment } from "@/lib/email/lifecycle";
import { isUnsubscribed } from "@/lib/email/unsubscribe";

export const runtime = "nodejs";

const REASSESSMENT_DAYS = 30;
const BATCH_SIZE = 50;

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

function displayName(fullName: string | null | undefined, email: string): string {
  if (fullName?.trim()) return fullName.trim().split(" ")[0] ?? "there";
  return email.split("@")[0] || "there";
}

/**
 * GET /api/cron/reassessment — daily Vercel cron that nudges users whose last
 * completed assessment is older than 30 days. Honors email_reminders_enabled
 * and the global unsubscribe list; dedupes via last_reassessment_email_at.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!cronSecret || !safeSecretEquals(auth, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = service();
  if (!db) {
    return NextResponse.json({ error: "Service role not configured." }, { status: 503 });
  }

  const cutoff = new Date(Date.now() - REASSESSMENT_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: assessments, error } = await db
    .from("assessments")
    .select("id, user_id, completed_at, created_at")
    .eq("status", "completed")
    .eq("is_shadow", false)
    .not("completed_at", "is", null)
    .lt("completed_at", cutoff)
    .order("completed_at", { ascending: true })
    .limit(500);

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[cron:reassessment:${correlationId}]`, error);
    return NextResponse.json({ error: "Query failed.", correlationId }, { status: 500 });
  }

  // Latest assessment per user (the query may return multiple rows per user).
  const latestByUser = new Map<string, { completedAt: string }>();
  for (const row of assessments ?? []) {
    const completedAt = row.completed_at ?? row.created_at;
    if (!completedAt) continue;
    const existing = latestByUser.get(row.user_id);
    if (!existing || new Date(completedAt) > new Date(existing.completedAt)) {
      latestByUser.set(row.user_id, { completedAt });
    }
  }

  let scanned = 0;
  let sent = 0;
  let skipped = 0;

  for (const [userId, { completedAt }] of latestByUser) {
    if (scanned >= BATCH_SIZE) break;
    scanned += 1;

    const daysSince = daysSinceAssessment(completedAt);
    if (daysSince < REASSESSMENT_DAYS) {
      skipped += 1;
      continue;
    }

    const { data: profile } = await db
      .from("profiles")
      .select("email, full_name, email_reminders_enabled, last_reassessment_email_at")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.email || profile.email_reminders_enabled === false) {
      skipped += 1;
      continue;
    }

    if (profile.last_reassessment_email_at) {
      const lastSent = new Date(profile.last_reassessment_email_at).getTime();
      if (Date.now() - lastSent < REASSESSMENT_DAYS * 24 * 60 * 60 * 1000) {
        skipped += 1;
        continue;
      }
    }

    if (await isUnsubscribed(profile.email)) {
      skipped += 1;
      continue;
    }

    const result = await sendTemplateEmail({
      template: "reassessment",
      to: profile.email,
      params: { name: displayName(profile.full_name, profile.email), daysSince },
    });

    if (result.ok && result.sent) {
      sent += 1;
      await db
        .from("profiles")
        .update({ last_reassessment_email_at: new Date().toISOString() })
        .eq("id", userId);
    } else {
      skipped += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: latestByUser.size,
    scanned,
    sent,
    skipped,
  });
}
