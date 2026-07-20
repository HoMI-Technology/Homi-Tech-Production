import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendTemplateEmail } from "@/lib/email/send";
import type { VerdictKey } from "@/lib/brand";

function service(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

function displayName(fullName: string | null | undefined, email: string): string {
  if (fullName?.trim()) return fullName.trim().split(" ")[0] ?? "there";
  const local = email.split("@")[0];
  return local || "there";
}

/**
 * Sends the welcome email once per account. Uses `welcome_email_sent_at` as the
 * dedupe key so repeat sign-ins never spam.
 */
export async function maybeSendWelcomeEmail(userId: string, email: string): Promise<void> {
  const db = service();
  if (!db) return;

  const { data: profile } = await db
    .from("profiles")
    .select("full_name, welcome_email_sent_at")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.welcome_email_sent_at) return;

  const result = await sendTemplateEmail({
    template: "welcome",
    to: email,
    params: { name: displayName(profile?.full_name, email) },
  });

  if (result.ok && result.sent) {
    await db
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", userId)
      .is("welcome_email_sent_at", null);
  }
}

/**
 * Delivers the verdict email after a completed full assessment. Transactional ΓÇö
 * always sends (not subject to marketing opt-out).
 */
export async function sendVerdictEmailForAssessment(options: {
  email: string;
  fullName: string | null | undefined;
  score: number;
  verdict: VerdictKey;
}): Promise<void> {
  await sendTemplateEmail({
    template: "verdict",
    to: options.email,
    params: {
      name: displayName(options.fullName, options.email),
      score: options.score,
      verdict: options.verdict,
    },
  });
}

/** Days since the last completed assessment for reassessment copy. */
export function daysSinceAssessment(completedAt: string): number {
  const then = new Date(completedAt).getTime();
  const now = Date.now();
  return Math.max(1, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
}

// --- Launch-loop pure planners (PR #60) --------------------------------------
export interface LifecycleAssessmentRow {
  id: string;
  user_id: string;
  completed_at: string | null;
  is_shadow: boolean | null;
}

export type LifecycleSendKind = "reassess30" | "outcome30" | "outcome90" | "outcome365";

export interface PlannedSend {
  kind: LifecycleSendKind;
  assessmentId: string;
  userId: string;
  dedupeKey: string;
  daysSince: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const OUTCOME_CHECKPOINTS: Array<{ kind: LifecycleSendKind; day: number }> = [
  { kind: "outcome30", day: 30 },
  { kind: "outcome90", day: 90 },
  { kind: "outcome365", day: 365 },
];
const GRACE_DAYS = 14;

export function daysBetween(fromIso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(fromIso).getTime()) / DAY_MS);
}

export function latestPerUser(rows: LifecycleAssessmentRow[]): LifecycleAssessmentRow[] {
  const byUser = new Map<string, LifecycleAssessmentRow>();
  for (const row of rows) {
    if (!row.completed_at) continue;
    const existing = byUser.get(row.user_id);
    if (!existing || new Date(row.completed_at) > new Date(existing.completed_at!)) {
      byUser.set(row.user_id, row);
    }
  }
  return [...byUser.values()];
}

export function planReassessmentNudges(rows: LifecycleAssessmentRow[], now: Date): PlannedSend[] {
  return latestPerUser(rows)
    .map((row) => ({ row, daysSince: daysBetween(row.completed_at!, now) }))
    .filter(({ daysSince }) => daysSince >= 30 && daysSince < 30 + GRACE_DAYS)
    .map(({ row, daysSince }) => ({
      kind: "reassess30" as const,
      assessmentId: row.id,
      userId: row.user_id,
      dedupeKey: `reassess30:${row.id}`,
      daysSince,
    }));
}

export function planOutcomeSurveys(rows: LifecycleAssessmentRow[], now: Date): PlannedSend[] {
  const sends: PlannedSend[] = [];
  for (const row of rows) {
    if (!row.completed_at || row.is_shadow) continue;
    const daysSince = daysBetween(row.completed_at, now);
    for (const { kind, day } of OUTCOME_CHECKPOINTS) {
      if (daysSince >= day && daysSince < day + GRACE_DAYS) {
        sends.push({
          kind,
          assessmentId: row.id,
          userId: row.user_id,
          dedupeKey: `${kind}:${row.id}`,
          daysSince,
        });
      }
    }
  }
  return sends;
}
