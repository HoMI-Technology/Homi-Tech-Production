import { NextResponse } from "next/server";
import { safeSecretEquals } from "@/lib/security";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendTemplateEmail } from "@/lib/email/send";
import { isUnsubscribed } from "@/lib/email/unsubscribe";
import { sendPush } from "@/lib/push/send";
import {
  pickOnePerUser,
  surveyNudgeCopy,
  SURVEY_NUDGE_PATH,
  type DueSurveyRow,
  type SurveyKind,
} from "@/lib/outcomes/survey-nudge";

export const runtime = "nodejs";

const BATCH_SIZE = 50;
const KIND_DAYS: Record<SurveyKind, number> = { day30: 30, day90: 90, day365: 365 };

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
 * GET /api/cron/outcome-surveys — daily Vercel cron that nudges users whose
 * day30/day90/day365 outcome survey has come due, over email (baseline) and
 * Web Push (if they opted in). This is the off-site delivery the crown-jewel
 * outcome dataset was missing: rows were created and shown in-app, but nothing
 * reached a user who had drifted away by the time a checkpoint landed.
 *
 * Idempotent: outcome_surveys.notified_at guards against re-nudging. A row is
 * marked notified once it's delivered on any channel OR the user has opted out
 * of every off-site channel; a purely transient send failure leaves it for the
 * next pass.
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

  const now = new Date();
  const { data: rows, error } = await db
    .from("outcome_surveys")
    .select("id, user_id, kind, due_at, completed_at, notified_at")
    .is("completed_at", null)
    .is("notified_at", null)
    .lte("due_at", now.toISOString())
    .order("due_at", { ascending: true })
    .limit(500);

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[cron:outcome-surveys:${correlationId}]`, error);
    return NextResponse.json({ error: "Query failed.", correlationId }, { status: 500 });
  }

  const due = pickOnePerUser((rows ?? []) as DueSurveyRow[], now).slice(0, BATCH_SIZE);

  let emailed = 0;
  let pushed = 0;
  let marked = 0;

  for (const row of due) {
    const { data: profile } = await db
      .from("profiles")
      .select("email, full_name, email_reminders_enabled")
      .eq("id", row.user_id)
      .maybeSingle();

    const days = KIND_DAYS[row.kind];
    let delivered = false;
    let emailAllowed = false;

    // ── Email (baseline) ─────────────────────────────────────────────────
    if (profile?.email && profile.email_reminders_enabled !== false) {
      emailAllowed = !(await isUnsubscribed(profile.email));
      if (emailAllowed) {
        const result = await sendTemplateEmail({
          template: "outcome_survey",
          to: profile.email,
          params: { name: displayName(profile.full_name, profile.email), days },
        });
        if (result.ok && result.sent) {
          delivered = true;
          emailed += 1;
          await db
            .from("profiles")
            .update({ last_outcome_survey_email_at: now.toISOString() })
            .eq("id", row.user_id);
        }
      }
    }

    // ── Web Push (additive) ──────────────────────────────────────────────
    const { data: subs } = await db
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", row.user_id);

    const copy = surveyNudgeCopy(row.kind);
    for (const sub of subs ?? []) {
      const res = await sendPush(sub, {
        title: copy.title,
        body: copy.body,
        url: SURVEY_NUDGE_PATH,
        tag: `outcome-survey-${row.id}`,
      });
      if (res.ok) {
        delivered = true;
        pushed += 1;
      } else if (res.gone) {
        await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }

    // Opted out of every off-site channel (email off/unsubscribed AND no push
    // subscriptions): mark notified so we don't reprocess daily. Due survey
    // rows stay until the user completes or dismisses them via the API.
    const optedOut = !emailAllowed && (subs ?? []).length === 0;

    await db.from("outcome_survey_events").insert({
      survey_id: row.id,
      user_id: row.user_id,
      event_type: "contact_attempted",
      channel: "system",
    });

    if (delivered) {
      await db.from("outcome_survey_events").insert({
        survey_id: row.id,
        user_id: row.user_id,
        event_type: "delivered",
        channel: emailAllowed ? "email" : "push",
      });
    } else if (optedOut) {
      await db.from("outcome_survey_events").insert({
        survey_id: row.id,
        user_id: row.user_id,
        event_type: "unreachable",
        channel: "system",
      });
    }

    if (delivered || optedOut) {
      await db
        .from("outcome_surveys")
        .update({
          notified_at: now.toISOString(),
          contact_state: delivered ? "delivered" : "unreachable",
        })
        .eq("id", row.id);
      marked += 1;
    }
  }

  return NextResponse.json({ ok: true, candidates: due.length, emailed, pushed, marked });
}
