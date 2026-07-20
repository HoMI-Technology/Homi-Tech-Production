/**
 * Browser-side Web Push helpers.
 * ==============================
 *
 * Client-only. Turns the base64url VAPID public key into the byte array
 * `pushManager.subscribe` expects, and wraps subscribe/unsubscribe with the
 * server round-trips. All functions no-op safely when push is unsupported.
 */

/** base64url → Uint8Array, per the applicationServerKey format. Backed by a
 * concrete ArrayBuffer so it satisfies BufferSource under strict TS. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** True when the SW currently holds a push subscription. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/**
 * Request permission, subscribe, and register with the server. Returns a
 * discriminated result rather than throwing so the UI can show a precise
 * message.
 */
export async function subscribeToPush(
  vapidPublicKey: string,
): Promise<{ ok: true } | { ok: false; reason: "unsupported" | "denied" | "error" }> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));

    const json = sub.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
    if (!res.ok) return { ok: false, reason: "error" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Unsubscribe locally and tell the server to drop the row. */
export async function unsubscribeFromPush(): Promise<{ ok: boolean }> {
  if (!pushSupported()) return { ok: true };
  try {
    const sub = await currentSubscription();
    if (!sub) return { ok: true };
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
