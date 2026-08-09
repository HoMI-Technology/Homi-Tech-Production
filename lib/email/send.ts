import {
  welcomeEmail,
  verdictEmail,
  reassessmentReminder,
  outcomeSurveyReminder,
  waitlistConfirmation,
} from "@/lib/email/templates";
import { isUnsubscribed, listUnsubscribeHeaders } from "@/lib/email/unsubscribe";
import type { VerdictKey } from "@/lib/brand";

export type EmailTemplate = "welcome" | "verdict" | "reassessment" | "outcome_survey" | "waitlist";

/** Marketing/lifecycle templates honor the global opt-out list. */
const MARKETING_TEMPLATES = new Set<EmailTemplate>([
  "welcome",
  "reassessment",
  "outcome_survey",
  "waitlist",
]);

const VERDICT_KEYS: VerdictKey[] = ["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"];

function isVerdictKey(value: unknown): value is VerdictKey {
  return typeof value === "string" && (VERDICT_KEYS as string[]).includes(value);
}

function renderTemplate(
  template: EmailTemplate,
  params?: Record<string, unknown>,
): { subject: string; html: string } {
  switch (template) {
    case "welcome":
      return welcomeEmail(String(params?.name ?? "there"));
    case "verdict": {
      const verdict = isVerdictKey(params?.verdict) ? params.verdict : "NOT_YET";
      return verdictEmail(String(params?.name ?? "there"), Number(params?.score ?? 0), verdict);
    }
    case "reassessment":
      return reassessmentReminder(String(params?.name ?? "there"), Number(params?.daysSince ?? 30));
    case "outcome_survey":
      return outcomeSurveyReminder(String(params?.name ?? "there"), Number(params?.days ?? 30));
    case "waitlist":
      return waitlistConfirmation();
    default: {
      const never: never = template;
      throw new Error(`Unknown email template: ${never}`);
    }
  }
}

export type SendEmailResult =
  | { ok: true; sent: true }
  | { ok: true; sent: false; reason: "unsubscribed" | "not_configured" }
  | { ok: false; reason: "provider_error" | "render_error" };

/**
 * Server-side email delivery. Mirrors `/api/email` but callable from routes and
 * cron jobs without an HTTP round-trip. Never throws ΓÇö callers log failures.
 */
export async function sendTemplateEmail(options: {
  template: EmailTemplate;
  to: string;
  params?: Record<string, unknown>;
}): Promise<SendEmailResult> {
  const { template, to, params } = options;

  if (MARKETING_TEMPLATES.has(template) && (await isUnsubscribed(to))) {
    return { ok: true, sent: false, reason: "unsubscribed" };
  }

  let rendered: { subject: string; html: string };
  try {
    rendered = renderTemplate(template, params);
  } catch (err) {
    console.error("[email:send] render failed", err);
    return { ok: false, reason: "render_error" };
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { ok: true, sent: false, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HōMI <hello@homitechnology.com>",
        to,
        subject: rendered.subject,
        html: rendered.html,
        ...(MARKETING_TEMPLATES.has(template) ? { headers: listUnsubscribeHeaders(to) } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const correlationId = crypto.randomUUID();
      console.error(`[email:send:${correlationId}]`, text);
      return { ok: false, reason: "provider_error" };
    }

    return { ok: true, sent: true };
  } catch (err) {
    const correlationId = crypto.randomUUID();
    console.error(`[email:send:${correlationId}]`, err);
    return { ok: false, reason: "provider_error" };
  }
}

// --- Launch-loop ledger API (PR #60) -----------------------------------------
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RenderedEmail {
  subject: string;
  html: string;
}

export type DeliverResult =
  | { ok: true; skipped?: undefined }
  | {
      ok: false;
      skipped: "unconfigured" | "unsubscribed" | "duplicate" | "provider_error" | "no_ledger";
    };

export async function deliverEmail(
  to: string,
  rendered: RenderedEmail,
  opts: { marketing: boolean },
): Promise<DeliverResult> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { ok: false, skipped: "unconfigured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HōMI <hello@homitechnology.com>",
        to,
        subject: rendered.subject,
        html: rendered.html,
        ...(opts.marketing ? { headers: listUnsubscribeHeaders(to) } : {}),
      }),
    });
    if (!res.ok) {
      const correlationId = crypto.randomUUID();
      const text = await res.text().catch(() => "");
      console.error(`[email:${correlationId}] provider rejected send:`, res.status, text);
      return { ok: false, skipped: "provider_error" };
    }
    return { ok: true };
  } catch (err) {
    const correlationId = crypto.randomUUID();
    console.error(
      `[email:${correlationId}] send failed:`,
      err instanceof Error ? err.message : "unknown",
    );
    return { ok: false, skipped: "provider_error" };
  }
}

export interface LifecycleEmailArgs {
  service: SupabaseClient;
  dedupeKey: string;
  userId: string | null;
  to: string;
  template: string;
  render: () => RenderedEmail;
  marketing: boolean;
}

export async function sendLifecycleEmail(args: LifecycleEmailArgs): Promise<DeliverResult> {
  const { service, dedupeKey, userId, to, template, render, marketing } = args;

  if (marketing && (await isUnsubscribed(to))) {
    return { ok: false, skipped: "unsubscribed" };
  }

  const { error: claimError } = await service
    .from("email_sends")
    .insert({ dedupe_key: dedupeKey, user_id: userId, email: to, template });

  if (claimError) {
    if (claimError.code === "23505") return { ok: false, skipped: "duplicate" };
    const correlationId = crypto.randomUUID();
    console.error(
      `[email-ledger:${correlationId}] claim failed:`,
      claimError.code,
      claimError.message,
    );
    return { ok: false, skipped: "no_ledger" };
  }

  const result = await deliverEmail(to, render(), { marketing });

  if (!result.ok && (result.skipped === "provider_error" || result.skipped === "unconfigured")) {
    await service.from("email_sends").delete().eq("dedupe_key", dedupeKey);
  }

  return result;
}
