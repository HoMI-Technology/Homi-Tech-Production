"use client";

import { useState } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/brand";
import type { SubscriptionTier } from "@/types/database";

const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
  family: "Family",
};

const TIER_COLORS: Record<SubscriptionTier, string> = {
  free: COLORS.dim,
  plus: COLORS.cyan,
  pro: COLORS.yellow,
  family: COLORS.emerald,
};

export function SubscriptionSection({
  tier,
  status,
  hasStripeCustomer,
}: {
  tier: SubscriptionTier;
  status?: string;
  hasStripeCustomer?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function handleManageBilling() {
    setLoading(true);
    setNote(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { configured: boolean; url?: string; error?: string };
      if (!data.configured) {
        setNote(
          tier === "free"
            ? "Choose a plan to start billing."
            : "Billing portal is not ready for this account yet.",
        );
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
  const isPaid = tier !== "free";

  return (
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-light">Subscription</h2>
      <p className="mt-1 text-sm text-dim">Your current plan and billing.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold"
          style={{ color, borderColor: `${color}59`, background: `${color}1a` }}
        >
          {TIER_LABELS[tier] ?? tier}
        </span>
        {status && status !== "free" && (
          <span className="text-xs text-dim">{status.replace(/_/g, " ")}</span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/settings/subscription" className="btn btn-primary btn-sm">
          {isPaid ? "Change plan" : "Choose a plan"}
        </Link>
        {isPaid && (
          <button
            type="button"
            onClick={handleManageBilling}
            disabled={loading || hasStripeCustomer === false}
            className="btn btn-ghost btn-sm disabled:opacity-60"
          >
            {loading ? "Opening…" : "Manage billing"}
          </button>
        )}
        <Link href="/pricing" className="btn btn-ghost btn-sm">
          Pricing
        </Link>
      </div>

      {note && <p className="mt-3 text-sm text-dim">{note}</p>}
    </section>
  );
}
