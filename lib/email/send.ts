import { welcomeEmail, verdictEmail, reassessmentReminder, waitlistConfirmation } from "@/lib/email/templates";
import { isUnsubscribed, listUnsubscribeHeaders } from "@/lib/email/unsubscribe";
import type { VerdictKey } from "@/lib/brand";

export type EmailTemplate = "welcome" | "verdict" | "reassessment" | "waitlist";

/** Marketing/lifecycle templates honor the global opt-out list. */
const MARKETING_TEMPLATES = new Set<EmailTemplate>(["welcome", "reassessment", "waitlist"]);

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
 * cron jobs without an HTTP round-trip. Never throws — callers log failures.
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
