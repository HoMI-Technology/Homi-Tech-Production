"use client";

import { useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";

export type PricingTier = "plus" | "pro" | "family";

type UiStatus = "idle" | "loading" | "error" | "not_configured" | "already_subscribed";

interface CheckoutResponse {
  configured?: boolean;
  url?: string;
  error?: string;
  message?: string;
  action?: string;
}

async function openBillingPortal(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  try {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      configured?: boolean;
      url?: string;
      error?: string;
    };
    if (res.status === 401) {
      return { ok: false, error: "sign_in" };
    }
    if (data.url) return { ok: true, url: data.url };
    if (data.configured === false) {
      return {
        ok: false,
        error: "Open Subscription in your account to manage your plan.",
      };
    }
    return { ok: false, error: data.error ?? "Could not open billing." };
  } catch {
    return { ok: false, error: "Could not open billing." };
  }
}

/**
 * Starts Stripe Checkout for a paid tier from the public pricing page.
 *
 * - 401 → sign-in and return to /pricing
 * - 409 already_subscribed → Customer Portal (or /settings/subscription)
 * - configured:false → honest "billing not configured" (not a fake waitlist)
 * - other errors → surface server message
 */
export function PricingCheckoutButton({
  tier,
  label,
  className = "",
}: {
  tier: PricingTier;
  label: string;
  className?: string;
}) {
  const [status, setStatus] = useState<UiStatus>("idle");
  const [detail, setDetail] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setDetail(null);
    track("checkout_started", { tier, source: "pricing" });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, source: "pricing" }),
      });

      const data: CheckoutResponse = await res.json().catch(() => ({}));

      if (res.status === 401) {
        window.location.href = "/auth/sign-in?next=/pricing";
        return;
      }

      if (res.status === 409 || data.error === "already_subscribed") {
        setStatus("already_subscribed");
        const portal = await openBillingPortal();
        if (portal.ok) {
          window.location.href = portal.url;
          return;
        }
        if (portal.error === "sign_in") {
          window.location.href = "/auth/sign-in?next=/settings/subscription";
          return;
        }
        setDetail(
          data.message ?? "You already have a plan. Manage it from Subscription in your account.",
        );
        return;
      }

      if (data.configured === false) {
        setStatus("not_configured");
        setDetail("Online checkout is not configured in this environment yet.");
        return;
      }

      if (!res.ok) {
        setStatus("error");
        setDetail(data.error ?? data.message ?? "Checkout failed. Try again in a moment.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setStatus("error");
      setDetail("Checkout did not return a payment link. Try again in a moment.");
    } catch {
      setStatus("error");
      setDetail("Could not reach checkout. Check your connection and try again.");
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className={`btn btn-primary ${className}`}
      >
        {status === "loading" ? "One moment…" : label}
      </button>

      {status === "already_subscribed" && (
        <p className="text-center text-xs text-dim">
          {detail ?? "You already have an active plan."}{" "}
          <Link
            href="/settings/subscription"
            className="text-cyan underline-offset-2 hover:underline"
          >
            Manage subscription
          </Link>
        </p>
      )}

      {status === "not_configured" && (
        <p className="text-center text-xs text-dim">
          {detail}{" "}
          <a
            href="mailto:hello@homitechnology.com"
            className="text-cyan underline-offset-2 hover:underline"
          >
            Contact us
          </a>
        </p>
      )}

      {status === "error" && (
        <p className="text-center text-xs text-dim" role="alert">
          {detail}
        </p>
      )}
    </div>
  );
}
