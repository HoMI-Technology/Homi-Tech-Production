"use client";

import { useEffect, useState } from "react";
import { PushToggle } from "@/components/settings/PushToggle";

export function NotificationsSection() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/account/notifications");
        if (!res.ok) {
          if (active) setLoading(false);
          return;
        }
        const json = (await res.json()) as { emailRemindersEnabled?: boolean };
        if (active) {
          setEnabled(json.emailRemindersEnabled ?? true);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    setError(null);
    setEnabled(next);

    try {
      const res = await fetch("/api/account/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emailRemindersEnabled: next }),
      });
      if (!res.ok) {
        setEnabled(!next);
        setError("Couldn't save your preference. Try again.");
      }
    } catch {
      setEnabled(!next);
      setError("Couldn't save your preference. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-light">Notifications</h2>
      <p className="mt-1 text-sm text-dim">
        Email reminders about check-ins, plan progress, and when it&apos;s time to reassess your readiness.
      </p>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-light">Email reminders</p>
          <p className="text-sm text-dim">
            Occasional nudges — including a 30-day reassessment reminder after your last read.
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={loading || saving}
          role="switch"
          aria-checked={enabled}
          aria-label="Email reminders"
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

      {/* Renders only when push is configured + supported (see PushToggle). */}
      <PushToggle />
    </section>
  );
}
