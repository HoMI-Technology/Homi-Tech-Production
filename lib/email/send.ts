import type { SupabaseClient } from "@supabase/supabase-js";
import { isUnsubscribed, listUnsubscribeHeaders } from "@/lib/email/unsubscribe";

/**
 * Server-side email delivery, shared by /api/email, the lifecycle triggers
 * (welcome / verdict), and the lifecycle cron. Two layers:
 *
 *   deliverEmail()        — raw Resend REST call (no SDK; graceful no-op when
 *                           RESEND_API_KEY is absent, matching every other
 *                           optional integration in this codebase).
 *   sendLifecycleEmail()  — deliverEmail + the email_sends idempotency ledger
 *                           (claim-first, migration 00020) + unsubscribe
 *                           suppression for marketing-class mail.
 *
 * Ledger ordering: claim → send → un-claim on provider failure. A crash
 * between claim and send loses at most one email (self-heals if the claim is
 * deleted); the reverse order would double-send on every cron retry, which is
 * the worse failure for trust. Callers should treat all of this as
 * fire-and-forget: email must never break an auth or save path.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
}

export type DeliverResult =
  | { ok: true; skipped?: undefined }
  | { ok: false; skipped: "unconfigured" | "unsubscribed" | "duplicate" | "provider_error" | "no_ledger" };

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
        // RFC 8058 one-click unsubscribe on marketing/lifecycle mail.
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
    console.error(`[email:${correlationId}] send failed:`, err instanceof Error ? err.message : "unknown");
    return { ok: false, skipped: "provider_error" };
  }
}

export interface LifecycleEmailArgs {
  /** Service-role client (email_sends has no user policies). */
  service: SupabaseClient;
  /** Deterministic key, e.g. `welcome:{userId}`, `verdict:{assessmentId}`. */
  dedupeKey: string;
  userId: string | null;
  to: string;
  /** Template name recorded in the ledger (observability only). */
  template: string;
  render: () => RenderedEmail;
  /** Marketing-class mail honors the unsubscribe list; transactional does not. */
  marketing: boolean;
}

export async function sendLifecycleEmail(args: LifecycleEmailArgs): Promise<DeliverResult> {
  const { service, dedupeKey, userId, to, template, render, marketing } = args;

  if (marketing && (await isUnsubscribed(to))) {
    return { ok: false, skipped: "unsubscribed" };
  }

  // Claim the dedupe key BEFORE sending — a unique-violation here means another
  // trigger/cron run already owns this send.
  const { error: claimError } = await service
    .from("email_sends")
    .insert({ dedupe_key: dedupeKey, user_id: userId, email: to, template });

  if (claimError) {
    if (claimError.code === "23505") return { ok: false, skipped: "duplicate" };
    const correlationId = crypto.randomUUID();
    console.error(`[email-ledger:${correlationId}] claim failed:`, claimError.code, claimError.message);
    return { ok: false, skipped: "no_ledger" };
  }

  const result = await deliverEmail(to, render(), { marketing });

  if (!result.ok && (result.skipped === "provider_error" || result.skipped === "unconfigured")) {
    // Release the claim so a later attempt (tomorrow's cron, the next sign-in,
    // or the moment RESEND_API_KEY lands) can re-try. The unique key still
    // guarantees at-most-once delivery.
    await service.from("email_sends").delete().eq("dedupe_key", dedupeKey);
  }

  return result;
}
