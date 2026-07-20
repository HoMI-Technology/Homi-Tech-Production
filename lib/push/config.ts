/**
 * Web Push (VAPID) configuration + gating.
 * ========================================
 *
 * Push is inert until three env vars are set, mirroring the repo's other
 * optional integrations (Sentry runs only with a DSN, the cron only with a
 * service role). Nothing here throws at import time so builds and unit tests
 * pass without keys.
 *
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY  public application server key (safe to ship
 *                                 to the browser — it identifies, doesn't
 *                                 authorize)
 *   VAPID_PRIVATE_KEY             server-only signing key (never NEXT_PUBLIC_)
 *   VAPID_SUBJECT                 mailto: or https: contact per the VAPID spec
 *
 * Generate a keypair with `npx web-push generate-vapid-keys`.
 */

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

/** The public application server key, or null when push isn't configured. */
export function vapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
}

/**
 * Full server-side VAPID config, or null when any piece is missing. Callers
 * (subscribe route, sender, cron) treat null as "push disabled" and no-op.
 */
export function vapidConfig(): VapidConfig | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    `mailto:hello@${(process.env.NEXT_PUBLIC_SITE_URL || "homitechnology.com").replace(/^https?:\/\//, "")}`;

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function isPushConfigured(): boolean {
  return vapidConfig() !== null;
}
