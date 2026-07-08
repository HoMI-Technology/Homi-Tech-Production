"use client";

import { useEffect, useState } from "react";

const NOTIFICATIONS_KEY = "homi:notifications";

export function NotificationsSection() {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setEnabled(window.localStorage.getItem(NOTIFICATIONS_KEY) === "1");
    } catch {
      setEnabled(false);
    }
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    try {
      window.localStorage.setItem(NOTIFICATIONS_KEY, next ? "1" : "0");
    } catch {
      // Not fatal — the toggle still reflects in-session state.
    }
  }

  return (
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-light">Notifications</h2>
      <p className="mt-1 text-sm text-dim">Reminders about your decision readiness. Coming soon.</p>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-light">Email reminders</p>
          <p className="text-sm text-dim">Occasional nudges about check-ins and plan progress.</p>
        </div>
        <button
          onClick={toggle}
          disabled={!mounted}
          role="switch"
          aria-checked={enabled}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
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
    </section>
  );
}
