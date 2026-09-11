import "server-only";

/**
 * Web Push sender.
 * ================
 *
 * Thin wrapper over the `web-push` library (VAPID JWT + aes128gcm payload
 * encryption — deliberately not hand-rolled). Server-only: imported by the
 * cron and the subscribe route's confirmation ping, never the browser. No
 * client-bundle cost.
 */

import webpush from "web-push";
import { vapidConfig } from "@/lib/push/config";

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export type PushResult =
  | { ok: true }
  | { ok: false; gone: true } // 404/410 — subscription expired, caller prunes
  | { ok: false; gone: false; status?: number };

let configured = false;

/** Idempotently apply VAPID details to the shared web-push client. */
function ensureConfigured(): boolean {
  const cfg = vapidConfig();
  if (!cfg) return false;
  if (!configured) {
    webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
    configured = true;
  }
  return true;
}

/**
 * Send one notification. Never throws — returns a discriminated result so the
 * caller can prune dead subscriptions (`gone: true`) without a try/catch.
 * Returns `{ ok: false, gone: false }` when push isn't configured.
 */
export async function sendPush(sub: StoredSubscription, payload: PushPayload): Promise<PushResult> {
  if (!ensureConfigured()) return { ok: false, gone: false };

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 24 * 60 * 60 },
    );
    return { ok: true };
  } catch (err: unknown) {
    const status =
      typeof err === "object" && err !== null && "statusCode" in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;
    // 404 Not Found / 410 Gone → the push service dropped this endpoint.
    if (status === 404 || status === 410) return { ok: false, gone: true };
    return { ok: false, gone: false, status };
  }
}
