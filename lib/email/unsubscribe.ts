import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * One-click email unsubscribe (CAN-SPAM + Gmail/Yahoo RFC 8058).
 *
 * The unsubscribe link carries the recipient email plus an HMAC token so the
 * endpoint can verify the request came from us without a per-send DB write or a
 * lookup table of tokens. The opt-out itself lives in `email_unsubscribes`
 * (migration 00016), read/written only by the service role.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://homitechnology.com";

function secret(): string {
  // Dedicated secret if set; otherwise fall back to the internal API secret so
  // this works in any environment that can already send email.
  return process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.INTERNAL_API_SECRET || "";
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/** Deterministic base64url HMAC of the (normalized) email. */
export function unsubscribeToken(email: string): string {
  return createHmac("sha256", secret()).update(normalize(email)).digest("base64url");
}

/** Constant-time token check. Returns false when no secret is configured. */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!secret() || !token) return false;
  const expected = unsubscribeToken(email);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Absolute unsubscribe URL for List-Unsubscribe and email footers. */
export function unsubscribeUrl(email: string): string {
  const e = encodeURIComponent(normalize(email));
  const t = encodeURIComponent(unsubscribeToken(email));
  return `${SITE}/api/unsubscribe?e=${e}&t=${t}`;
}

/** Human-facing confirmation page URL (same params). */
export function unsubscribePageUrl(email: string): string {
  const e = encodeURIComponent(normalize(email));
  const t = encodeURIComponent(unsubscribeToken(email));
  return `${SITE}/unsubscribe?e=${e}&t=${t}`;
}

/**
 * List-Unsubscribe headers for the Resend payload. Returns {} when no secret is
 * configured (so sends still work; the footer link remains the fallback).
 */
export function listUnsubscribeHeaders(email: string): Record<string, string> {
  if (!secret()) return {};
  return {
    "List-Unsubscribe": `<${unsubscribeUrl(email)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

function service(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

/** True when this email has opted out. Fails open (false) if DB is unreachable. */
export async function isUnsubscribed(email: string): Promise<boolean> {
  const db = service();
  if (!db) return false;
  const { data, error } = await db
    .from("email_unsubscribes")
    .select("email")
    .eq("email", normalize(email))
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

/** Records an opt-out. Returns true on success (or if already recorded). */
export async function recordUnsubscribe(email: string, source: string): Promise<boolean> {
  const db = service();
  if (!db) return false;
  const { error } = await db
    .from("email_unsubscribes")
    .upsert({ email: normalize(email), source }, { onConflict: "email" });
  return !error;
}
