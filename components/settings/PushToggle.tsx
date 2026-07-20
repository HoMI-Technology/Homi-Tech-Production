"use client";

import { useEffect, useState } from "react";
import {
  currentSubscription,
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * Push-notification opt-in, shown beside email reminders. Renders nothing
 * unless the server is VAPID-configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY present)
 * and the browser supports push — so it stays invisible until push is live,
 * and never shows a control that can't work.
 */
export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY || !pushSupported()) return;
    setSupported(true);
    currentSubscription().then((sub) => setEnabled(!!sub));
  }, []);

  if (!VAPID_PUBLIC_KEY || !supported) return null;

  async function toggle() {
    setBusy(true);
    setError(null);
    if (!enabled) {
      const res = await subscribeToPush(VAPID_PUBLIC_KEY!);
      if (res.ok) setEnabled(true);
      else if (res.reason === "denied")
        setError("Notifications are blocked in your browser settings.");
      else setError("Couldn't enable push. Try again.");
    } else {
      const res = await unsubscribeFromPush();
      if (res.ok) setEnabled(false);
      else setError("Couldn't disable push. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-6 border-t border-slate-high/40 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-light">Push notifications</p>
          <p className="text-sm text-dim">
            A nudge on this device when an outcome check-in comes due — day 30, 90, and 365.
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={busy}
          role="switch"
          aria-checked={enabled}
          aria-label="Push notifications"
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            enabled ? "bg-cyan" : "bg-slate-surface"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-crimson">{error}</p>}
    </div>
  );
}
