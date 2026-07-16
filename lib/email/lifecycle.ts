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
 * Delivers the verdict email after a completed full assessment. Transactional —
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
