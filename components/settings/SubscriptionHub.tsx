"use client";

import { useState } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/brand";
import { TIERS, type TierKey } from "@/lib/stripe/tiers";
import type { SubscriptionTier } from "@/types/database";
import { track } from "@/lib/analytics";

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

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past due",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  incomplete: "Incomplete",
  unpaid: "Unpaid",
  free: "—",
  "": "—",
};

const PAID_ORDER: TierKey[] = ["plus", "pro", "family"];

function statusTone(status: string): string {
  if (status === "active" || status === "trialing") return COLORS.emerald;
  if (status === "past_due" || status === "unpaid") return COLORS.crimson;
  return COLORS.dim;
}

export function SubscriptionHub({
  tier,
  status,
  hasStripeCustomer,
  upgraded,
}: {
  tier: SubscriptionTier;
  status: string;
  hasStripeCustomer: boolean;
  upgraded?: boolean;
}) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<TierKey | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const color = TIER_COLORS[tier] ?? TIER_COLORS.free;
  const statusColor = statusTone(status);
  const isPaid = tier !== "free";

  async function openPortal() {
    setPortalLoading(true);
    setNote(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { configured?: boolean; url?: string; error?: string };
      if (res.status === 401) {
        window.location.href = "/auth/sign-in?next=/settings/subscription";
        return;
      }
      if (!data.configured) {
        setNote(
          isPaid
            ? "Billing portal is not available yet for this account. Contact support if you need a plan change."
            : "Subscribe to a plan first — then you can manage billing here.",
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
      setPortalLoading(false);
    }
  }

  async function startCheckout(target: TierKey) {
    setCheckoutLoading(target);
    setNote(null);
    track("checkout_started", { tier: target, source: "subscription_hub" });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: target, source: "subscription" }),
      });
      if (res.status === 401) {
        window.location.href = "/auth/sign-in?next=/settings/subscription";
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        configured?: boolean;
        url?: string;
        error?: string;
      };
      if (!res.ok || data.configured === false || !data.url) {
        setNote(data.error ?? "Checkout is unavailable right now. Try again in a moment.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setNote("Checkout is unavailable right now. Try again in a moment.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  function ctaFor(target: TierKey): { label: string; action: "checkout" | "portal" | "current" } {
    if (tier === target) return { label: "Current plan", action: "current" };
    if (isPaid && hasStripeCustomer) {
      // Existing subscribers change plans / cancel in the portal (proration-safe).
      return {
        label: PAID_ORDER.indexOf(target) > PAID_ORDER.indexOf(tier as TierKey) ? "Upgrade in billing" : "Change plan",
        action: "portal",
      };
    }
    return {
      label: `Start ${TIERS[target].name.replace("HōMI ", "")}`,
      action: "checkout",
    };
  }

  return (
    <div className="flex flex-col gap-8">
      {upgraded && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: `${COLORS.emerald}66`,
            background: `${COLORS.emerald}14`,
            color: COLORS.light,
          }}
          role="status"
        >
          You&rsquo;re upgraded. Stripe may take a few seconds to sync — refresh if your plan badge looks stale.
        </div>
      )}

      <section className="glass p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-light sm:text-3xl">Subscription</h1>
        <p className="mt-2 text-sm text-dim">
          View your plan, upgrade, or open Stripe to change payment method and cancel.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold"
            style={{ color, borderColor: `${color}59`, background: `${color}1a` }}
          >
            {TIER_LABELS[tier] ?? tier}
          </span>
          <span
            className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
            style={{ color: statusColor, borderColor: `${statusColor}59`, background: `${statusColor}1a` }}
          >
            {STATUS_LABELS[status] ?? status ?? "—"}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {isPaid && (
            <button
              type="button"
              onClick={openPortal}
              disabled={portalLoading}
              className="btn btn-primary btn-sm disabled:opacity-60"
            >
              {portalLoading ? "Opening…" : "Manage billing"}
            </button>
          )}
          <Link href="/pricing" className="btn btn-ghost btn-sm">
            View public pricing
          </Link>
          <Link href="/settings" className="btn btn-ghost btn-sm">
            Back to settings
          </Link>
        </div>

        {note && (
          <p className="mt-4 text-sm text-dim" role="status">
            {note}
          </p>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-light">Monthly plans</h2>
        <p className="mt-1 text-sm text-dim">
          {isPaid
            ? "Switch plans or update payment details in the Stripe billing portal. Proration is applied automatically."
            : "Pick a plan to open secure Stripe Checkout. You can change or cancel anytime."}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PAID_ORDER.map((key) => {
            const plan = TIERS[key];
            const cta = ctaFor(key);
            const isCurrent = tier === key;
            return (
              <div
                key={key}
                className={`glass flex h-full flex-col p-5 ${isCurrent ? "border-cyan/40" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-bold text-light">{plan.name.replace("HōMI ", "")}</h3>
                  {isCurrent && (
                    <span className="text-xs font-semibold text-cyan">Current</span>
                  )}
                </div>
                <p className="mt-2 score-numeral text-3xl font-bold text-light">
                  ${plan.priceMonthlyUsd}
                  <span className="text-sm font-normal text-dim">/mo</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f} className="text-xs leading-relaxed text-dim">
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  {cta.action === "current" ? (
                    <button type="button" disabled className="btn btn-ghost w-full opacity-60">
                      {cta.label}
                    </button>
                  ) : cta.action === "portal" ? (
                    <button
                      type="button"
                      onClick={openPortal}
                      disabled={portalLoading}
                      className="btn btn-primary w-full disabled:opacity-60"
                    >
                      {portalLoading ? "Opening…" : cta.label}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startCheckout(key)}
                      disabled={checkoutLoading !== null}
                      className="btn btn-primary w-full disabled:opacity-60"
                    >
                      {checkoutLoading === key ? "One moment…" : cta.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass p-6 text-sm text-dim">
        <h2 className="font-display text-base font-semibold text-light">How billing works</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Subscriptions are monthly. Cancel anytime in Manage billing — access lasts through the period you paid for.</li>
          <li>Plan changes for existing subscribers go through Stripe&rsquo;s customer portal so payment method and proration stay correct.</li>
          <li>New paid plans open Stripe Checkout. You need a signed-in HōMI account first.</li>
          <li>
            Questions? Email{" "}
            <a className="text-cyan underline-offset-2 hover:underline" href="mailto:hello@homitechnology.com">
              hello@homitechnology.com
            </a>
            .
          </li>
        </ul>
      </section>
    </div>
  );
}
