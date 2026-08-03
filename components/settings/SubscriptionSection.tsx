"use client";

import { useState } from "react";
import type { SubscriptionTier } from "@/types/database";

const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
  family: "Family",
};

const TIER_COLORS: Record<SubscriptionTier, string> = {
  free: "#94a3b8",
  plus: "#22d3ee",
  pro: "#facc15",
  family: "#34d399",
};

export function SubscriptionSection({ tier }: { tier: SubscriptionTier }) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function handleManageBilling() {
    setLoading(true);
    setNote(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { configured: boolean; url?: string; error?: string };
      if (!data.configured) {
        setNote("Billing opens soon.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setNote(data.error ?? "Could not open billing right now.");
    } catch {
      setNote("Could not open billing right now.");
    } finally {
      setLoading(false);
    }
  }

  const color = TIER_COLORS[tier] ?? TIER_COLORS.free;

  return (
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-light">Subscription</h2>
      <p className="mt-1 text-sm text-dim">Your current plan and billing.</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <span
          className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold"
          style={{ color, borderColor: `${color}59`, background: `${color}1a` }}
        >
          {TIER_LABELS[tier] ?? tier}
        </span>

        <button
          onClick={handleManageBilling}
          disabled={loading}
          className="btn btn-ghost btn-sm disabled:opacity-60"
        >
          {loading ? "Opening…" : "Manage billing"}
        </button>

        {note && <span className="text-sm text-dim">{note}</span>}
      </div>
    </section>
  );
}
