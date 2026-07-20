import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLifecycleEmail } from "@/lib/email/send";
import {
  planReassessmentNudges,
  planOutcomeSurveys,
  type LifecycleAssessmentRow,
  type PlannedSend,
} from "@/lib/email/lifecycle";
import { reassessmentReminder, outcomeSurveyEmail } from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/lifecycle — daily retention + outcome-data loop (vercel.json).
 *
 * Sends, in priority order and capped per run:
 *   1. outcome-survey invitations at day 30/90/365 after each full assessment
 *      (the verdict-validation dataset — the moat — so it outranks nudges);
 *   2. 30-day reassessment nudges when a user's latest assessment went stale.
 *
 * Every send is idempotent via the email_sends ledger, so overlapping runs,
 * retries, and the 14-day planner grace windows can never double-send. Auth:
 * Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`; the route fails
 * closed when the secret is unset.
 */

/** Resend's default rate is ~2 rps; 50/run keeps a daily run well clear. */
const MAX_SENDS_PER_RUN = 50;
/** Newest assessments window scanned per run; launch-scale appropriate. */
const SCAN_LIMIT = 500;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createAdminClient();
  if (!service) {
    return NextResponse.json({ ok: false, skipped: "no_service_role" });
  }

  const { data, error } = await service
    .from("assessments")
    .select("id, user_id, completed_at, is_shadow")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(SCAN_LIMIT);

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[cron/lifecycle:${correlationId}] scan failed:`, error.code, error.message);
    return NextResponse.json({ error: "Scan failed.", correlationId }, { status: 500 });
  }

  const rows = (data ?? []) as LifecycleAssessmentRow[];
  const now = new Date();
  const planned: PlannedSend[] = [
    ...planOutcomeSurveys(rows, now),
    ...planReassessmentNudges(rows, now),
  ].slice(0, MAX_SENDS_PER_RUN);

  let sent = 0;
  let skipped = 0;

  for (const send of planned) {
    const { data: profile } = await service
      .from("profiles")
      .select("email, full_name")
      .eq("id", send.userId)
      .maybeSingle();

    const to = (profile as { email?: string } | null)?.email;
    if (!to) {
      skipped += 1;
      continue;
    }
    const name =
      (profile as { full_name?: string | null } | null)?.full_name?.split(" ")[0] || "there";

    const result = await sendLifecycleEmail({
      service,
      dedupeKey: send.dedupeKey,
      userId: send.userId,
      to,
      template: send.kind,
      marketing: true,
      render: () =>
        send.kind === "reassess30"
          ? reassessmentReminder(name, send.daysSince)
          : outcomeSurveyEmail(name, send.daysSince),
    });

    if (result.ok) sent += 1;
    else skipped += 1;
  }

  return NextResponse.json({ ok: true, planned: planned.length, sent, skipped });
}
