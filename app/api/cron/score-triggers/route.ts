import { NextResponse } from "next/server";
import { safeSecretEquals } from "@/lib/security";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  detectScoreRelevantChanges,
  snapshotFromAssessmentInputs,
  snapshotFromFinanceState,
  SCORE_METRIC_LABELS,
  type AssessmentScoreInputs,
  type ScoreMetric,
} from "@/lib/finance/live-update";
import type { FinanceState } from "@/lib/finance/store";

export const runtime = "nodejs";

const BATCH_SIZE = 500;

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

interface TriggerFlag {
  userId: string;
  assessmentId: string;
  metrics: ScoreMetric[];
  estimatedPointImpact: number;
}

/**
 * GET /api/cron/score-triggers — periodic detector for band-crossing finance
 * changes. For each user with a completed assessment, compares the band
 * snapshot of the assessment's inputs against the band snapshot of their
 * synced finance dashboard numbers (user_finance_state) using the shared
 * pure functions in lib/finance/live-update.ts.
 *
 * Detection plus dedupe, no scoring: it never recomputes a score (the
 * engine is frozen and only /api/scoring scores) and it never emails. Each
 * detected band crossing is recorded in score_trigger_notifications keyed by
 * (user_id, trigger_signature), where the signature pins the assessment id
 * and the sorted metric set — so repeat runs do not re-flag the same
 * crossing, and a new completed assessment resets dedupe. The response lists
 * newly flagged users so an operator (or a future notification channel) can
 * act on it: `flagged` is all detected crossings, `notified` is the subset
 * newly recorded, and `triggers` details only the newly recorded ones.
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

  const { data: assessments, error } = await db
    .from("assessments")
    .select("id, user_id, inputs, completed_at, created_at")
    .eq("status", "completed")
    .eq("is_shadow", false)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(BATCH_SIZE);

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[cron:score-triggers:${correlationId}]`, error);
    return NextResponse.json({ error: "Query failed.", correlationId }, { status: 500 });
  }

  // Latest assessment per user (rows arrive newest-first).
  const latestByUser = new Map<string, { id: string; inputs: Record<string, unknown> | null }>();
  for (const row of assessments ?? []) {
    if (!latestByUser.has(row.user_id)) {
      latestByUser.set(row.user_id, { id: row.id, inputs: row.inputs });
    }
  }

  const userIds = [...latestByUser.keys()];
  const financeByUser = new Map<string, FinanceState>();
  if (userIds.length > 0) {
    const { data: financeRows, error: financeError } = await db
      .from("user_finance_state")
      .select("user_id, state")
      .in("user_id", userIds);

    if (financeError) {
      const correlationId = crypto.randomUUID();
      console.error(`[cron:score-triggers:${correlationId}]`, financeError);
      return NextResponse.json({ error: "Query failed.", correlationId }, { status: 500 });
    }

    for (const row of financeRows ?? []) {
      if (row.state && typeof row.state === "object") {
        financeByUser.set(row.user_id, row.state as FinanceState);
      }
    }
  }

  const detected: TriggerFlag[] = [];
  let compared = 0;

  for (const [userId, { id, inputs }] of latestByUser) {
    const finance = financeByUser.get(userId);
    if (!finance) continue;
    const baseline = snapshotFromAssessmentInputs(
      inputs as Partial<AssessmentScoreInputs> | null,
    );
    if (!baseline) continue;
    compared += 1;
    const change = detectScoreRelevantChanges(baseline, snapshotFromFinanceState(finance));
    if (change.changed) {
      detected.push({
        userId,
        assessmentId: id,
        metrics: change.changes.map((c) => c.metric),
        estimatedPointImpact: change.estimatedPointImpact,
      });
    }
  }

  // Dedupe against score_trigger_notifications: a crossing is flagged (and
  // counted as notified) only the first time its signature is seen.
  const signatureOf = (t: TriggerFlag) =>
    `band:${t.assessmentId}:${[...t.metrics].sort().join(",")}`;

  const triggers: TriggerFlag[] = [];
  let notified = 0;

  if (detected.length > 0) {
    const { data: existingRows, error: existingError } = await db
      .from("score_trigger_notifications")
      .select("user_id, trigger_signature")
      .in("user_id", detected.map((t) => t.userId));

    if (existingError) {
      // Dedupe store unavailable (e.g. migration not yet applied) — log and
      // flag everything rather than dropping the signal.
      const correlationId = crypto.randomUUID();
      console.error(`[cron:score-triggers:${correlationId}]`, existingError);
    }

    const alreadySent = new Set(
      (existingRows ?? []).map((r) => `${r.user_id}:${r.trigger_signature}`),
    );
    for (const t of detected) {
      if (!alreadySent.has(`${t.userId}:${signatureOf(t)}`)) {
        triggers.push(t);
      }
    }

    if (triggers.length > 0) {
      const { error: insertError } = await db
        .from("score_trigger_notifications")
        .upsert(
          triggers.map((t) => ({
            user_id: t.userId,
            trigger_signature: signatureOf(t),
          })),
          { onConflict: "user_id,trigger_signature", ignoreDuplicates: true },
        );

      if (insertError) {
        // Recording failed — flag anyway; the next run will retry the send.
        const correlationId = crypto.randomUUID();
        console.error(`[cron:score-triggers:${correlationId}]`, insertError);
      } else {
        notified = triggers.length;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: latestByUser.size,
    compared,
    flagged: detected.length,
    notified,
    metricLabels: SCORE_METRIC_LABELS,
    triggers,
  });
}
