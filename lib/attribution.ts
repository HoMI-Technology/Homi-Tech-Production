/**
 * First-touch acquisition attribution (AUDIT follow-up; migration 00019).
 *
 * A visitor's first landing with any of ?ref= / ?utm_* is snapshotted into a
 * 90-day cookie by <AttributionCapture/> and stamped server-side onto the
 * profile (auth callback) and each assessment (save route). First-touch wins:
 * an existing cookie or an existing profile snapshot is never overwritten —
 * for launch-phase channel truth, "who introduced this user" matters more
 * than "what did they click last".
 *
 * Occurrence data only: channel identifiers and the landing path. Never
 * scores, answers, or anything user-entered.
 */

export const ATTRIBUTION_COOKIE = "homi_attr";
export const ATTRIBUTION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export interface AttributionSnapshot {
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  /** Pathname of the first-touch landing page. */
  landing?: string;
  /** ISO timestamp of first touch. */
  at: string;
}

const FIELD_MAX = 100;

/** Keep channel identifiers boring: trim, cap, drop anything non-token-ish. */
function sanitize(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .trim()
    .slice(0, FIELD_MAX)
    .replace(/[^\w\-.:/ ]/g, "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/** Builds a snapshot from a landing URL; null when nothing attributable is present. */
export function buildAttribution(
  searchParams: URLSearchParams,
  pathname: string,
  now: Date,
): AttributionSnapshot | null {
  const ref = sanitize(searchParams.get("ref"));
  const utm_source = sanitize(searchParams.get("utm_source"));
  const utm_medium = sanitize(searchParams.get("utm_medium"));
  const utm_campaign = sanitize(searchParams.get("utm_campaign"));
  if (!ref && !utm_source && !utm_medium && !utm_campaign) return null;
  return {
    ...(ref ? { ref } : {}),
    ...(utm_source ? { utm_source } : {}),
    ...(utm_medium ? { utm_medium } : {}),
    ...(utm_campaign ? { utm_campaign } : {}),
    landing: sanitize(pathname) ?? "/",
    at: now.toISOString(),
  };
}

/** Parses + revalidates the snapshot out of a raw Cookie header. */
export function readAttributionCookie(cookieHeader: string | null): AttributionSnapshot | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ATTRIBUTION_COOKIE}=`));
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match.slice(ATTRIBUTION_COOKIE.length + 1));
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || typeof parsed.at !== "string") return null;
    const snapshot: AttributionSnapshot = { at: parsed.at.slice(0, 40) };
    for (const key of ["ref", "utm_source", "utm_medium", "utm_campaign", "landing"] as const) {
      const value = sanitize(typeof parsed[key] === "string" ? (parsed[key] as string) : undefined);
      if (value) snapshot[key] = value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

/** Cookie value ready for document.cookie assignment (client capture). */
export function serializeAttributionCookie(snapshot: AttributionSnapshot): string {
  const value = encodeURIComponent(JSON.stringify(snapshot));
  return `${ATTRIBUTION_COOKIE}=${value}; Max-Age=${ATTRIBUTION_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

/**
 * Partner invite codes are `ptr_` + 8 alphanumerics (see partner_codes mint).
 * Used to denormalize assessments.referral_source = partner_user_id on write.
 */
export const PARTNER_REF_PATTERN = /^ptr_[a-z0-9]{8}$/i;

export function isPartnerInviteRef(ref: string | undefined | null): boolean {
  return Boolean(ref && PARTNER_REF_PATTERN.test(ref));
}

/**
 * Pure helper: given a first-touch snapshot and a code→partner map, return the
 * partner profile id to stamp on assessments.referral_source. Does not set
 * profiles.partner_id (named roster is an explicit relationship, not invite traffic).
 */
export function resolvePartnerReferralSource(
  attribution: AttributionSnapshot | null | undefined,
  codeToPartnerId: ReadonlyMap<string, string> | Record<string, string>,
): string | null {
  const ref = attribution?.ref;
  if (!ref || !isPartnerInviteRef(ref)) return null;
  const key = ref.toLowerCase();
  if (codeToPartnerId instanceof Map) {
    return codeToPartnerId.get(key) ?? codeToPartnerId.get(ref) ?? null;
  }
  const record = codeToPartnerId as Record<string, string>;
  return record[key] ?? record[ref] ?? null;
}
