import type { SupabaseClient } from "@supabase/supabase-js";
import { campaignEmail } from "@/lib/email/templates";
import { listUnsubscribeHeaders, unsubscribePageUrl } from "@/lib/email/unsubscribe";

/**
 * Broadcast campaign plumbing (Module C — /admin/email + /api/admin/campaigns).
 *
 * Audience resolution reads waitlist + profiles, then the unsubscribe list
 * (email_unsubscribes, 00016) partitions recipients before a single provider
 * call is made. Delivery uses the Resend batch API (max 100 messages per
 * request) with per-recipient List-Unsubscribe headers.
 */

export const CAMPAIGN_AUDIENCES = ["waitlist", "free", "plus", "pro", "family", "all"] as const;
export type CampaignAudience = (typeof CAMPAIGN_AUDIENCES)[number];

export function isCampaignAudience(value: unknown): value is CampaignAudience {
  return typeof value === "string" && (CAMPAIGN_AUDIENCES as readonly string[]).includes(value);
}

/** Resend batch API hard limit — never exceed 100 messages per request. */
export const RESEND_BATCH_LIMIT = 100;

/** Small pause between batch requests so a large blast doesn't hammer Resend. */
const BATCH_DELAY_MS = 500;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeCampaignEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface AudiencePartition {
  /** Deduped, normalized, deliverable recipients. */
  sendable: string[];
  /** Recipients dropped because they appear on the unsubscribe list. */
  suppressed: string[];
}

/**
 * Pure unsubscribe filter: normalize + dedupe + drop malformed addresses, then
 * split against the opt-out set. Kept side-effect free so the vitest suite can
 * pin the exact contract the API route relies on.
 */
export function partitionByUnsubscribe(
  emails: string[],
  unsubscribed: Set<string>,
): AudiencePartition {
  const seen = new Set<string>();
  const sendable: string[] = [];
  const suppressed: string[] = [];

  for (const raw of emails) {
    const email = normalizeCampaignEmail(raw);
    if (!EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    if (unsubscribed.has(email)) {
      suppressed.push(email);
    } else {
      sendable.push(email);
    }
  }

  return { sendable, suppressed };
}

/** Split into batches of at most `size` (Resend caps batch sends at 100). */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** PostgREST caps responses — page range by range until a short page. */
const PAGE_SIZE = 1000;

/**
 * Resolve the raw recipient list for an audience from waitlist + profiles.
 * Returns every stored address (un-normalized); filtering happens in
 * resolveAudienceRecipients.
 */
export async function resolveAudienceEmails(
  service: SupabaseClient,
  audience: CampaignAudience,
): Promise<string[]> {
  const emails: string[] = [];

  const wantsWaitlist = audience === "waitlist" || audience === "all";
  const wantsProfiles = audience !== "waitlist";

  if (wantsWaitlist) {
    let from = 0;
    for (;;) {
      const { data, error } = await service
        .from("waitlist")
        .select("email")
        .range(from, from + PAGE_SIZE - 1);
      if (error || !data || data.length === 0) break;
      emails.push(...data.map((r: { email: string }) => r.email));
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  if (wantsProfiles) {
    let from = 0;
    for (;;) {
      let query = service.from("profiles").select("email");
      if (audience !== "all") {
        query = query.eq("subscription_tier", audience);
      }
      const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
      if (error || !data || data.length === 0) break;
      emails.push(...data.map((r: { email: string }) => r.email));
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  return emails;
}

/** Load the full opt-out list as a normalized Set (service-role only table). */
export async function fetchUnsubscribedSet(service: SupabaseClient): Promise<Set<string>> {
  const set = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await service
      .from("email_unsubscribes")
      .select("email")
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data as { email: string }[]) set.add(normalizeCampaignEmail(row.email));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return set;
}

export interface ResolvedAudience extends AudiencePartition {
  /** Raw rows seen before normalization/dedupe (for diagnostics). */
  total: number;
}

/** Full resolution: audience tables → normalize/dedupe → unsubscribe partition. */
export async function resolveAudienceRecipients(
  service: SupabaseClient,
  audience: CampaignAudience,
): Promise<ResolvedAudience> {
  const raw = await resolveAudienceEmails(service, audience);
  const unsubscribed = await fetchUnsubscribedSet(service);
  const partition = partitionByUnsubscribe(raw, unsubscribed);
  return { ...partition, total: raw.length };
}

export interface BatchSendResult {
  sent: string[];
  failed: { email: string; error: string }[];
}

/**
 * Send one campaign batch (≤100 recipients) through the Resend batch API.
 * Every message carries per-recipient List-Unsubscribe headers (RFC 8058).
 */
async function sendBatch(
  messages: { to: string; subject: string; html: string }[],
  resendKey: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        messages.map((m) => ({
          from: "HōMI <hello@homitechnology.com>",
          to: m.to,
          subject: m.subject,
          html: m.html,
          headers: listUnsubscribeHeaders(m.to),
        })),
      ),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const correlationId = crypto.randomUUID();
      console.error(`[campaign:${correlationId}] batch rejected:`, res.status, text);
      return { ok: false, error: `provider_error (${res.status})` };
    }
    return { ok: true };
  } catch (err) {
    const correlationId = crypto.randomUUID();
    console.error(
      `[campaign:${correlationId}] batch failed:`,
      err instanceof Error ? err.message : "unknown",
    );
    return { ok: false, error: "provider_error (network)" };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Deliver a campaign body to every sendable recipient, batching at the Resend
 * 100/request ceiling with a pause between requests. Returns per-recipient
 * outcomes for the campaign_sends ledger.
 */
export async function sendCampaignEmails(options: {
  recipients: string[];
  subject: string;
  bodyHtml: string;
}): Promise<BatchSendResult> {
  const { recipients, subject, bodyHtml } = options;
  const resendKey = process.env.RESEND_API_KEY;
  const result: BatchSendResult = { sent: [], failed: [] };
  if (!resendKey || recipients.length === 0) return result;

  const batches = chunk(recipients, RESEND_BATCH_LIMIT);
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const messages = batch.map((to) => ({
      to,
      subject,
      html: campaignEmail(bodyHtml, unsubscribePageUrl(to)).html,
    }));
    const outcome = await sendBatch(messages, resendKey);
    if (outcome.ok) {
      result.sent.push(...batch);
    } else {
      result.failed.push(...batch.map((email) => ({ email, error: outcome.error })));
    }
    if (i < batches.length - 1) await delay(BATCH_DELAY_MS);
  }

  return result;
}
