import { BRAND } from "@/lib/brand";

/**
 * Verified sender identity for all outbound product mail (Resend HTTPS API).
 *
 * ⚠ This address must live on the Resend-verified domain or every send fails at
 * the provider with a 403 — see GO-LIVE-CHECKLIST §1. It was previously
 * hardcoded in four places (`lib/email/send.ts` ×2, `lib/email/campaign.ts`,
 * `app/api/household/invite/route.ts`); this is the single source of truth.
 *
 * `EMAIL_FROM` lets ops repoint the sender without a code change (e.g. a
 * `noreply@` subdomain), but the default stays the canonical brand identity,
 * so an unset env behaves exactly as before. Overriding it to a domain Resend
 * has not verified re-introduces the 403 — keep it on {@link BRAND.domain}.
 */
export const EMAIL_FROM =
  process.env.EMAIL_FROM || `${BRAND.name} <hello@${BRAND.domain}>`;
