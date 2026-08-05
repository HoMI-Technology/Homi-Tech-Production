"use client";

import { useState, type FormEvent } from "react";
import { track } from "@/lib/analytics";

export type PricingTier = "plus" | "pro" | "family";

interface CheckoutResponse {
  configured?: boolean;
  url?: string;
}

/**
 * Posts to /api/checkout with the selected tier. That route is owned by
 * another workstream — this component only calls it defensively. If the
 * endpoint is missing, unreachable, or reports { configured: false }, we
 * show an inline waitlist capture so the visitor is never dead-ended.
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
  const [status, setStatus] = useState<"idle" | "loading" | "unavailable" | "error">("idle");
  const [email, setEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );

  async function handleWaitlistSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setWaitlistStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, interest: `pricing-${tier}` }),
      });
      setWaitlistStatus(res.ok ? "success" : "error");
    } catch {
      setWaitlistStatus("error");
    }
  }

  async function handleClick() {
    setStatus("loading");
    track("checkout_started", { tier });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      if (res.status === 401) {
        // Checkout requires a signed-in account — send them to sign-in, then back to pricing.
        window.location.href = "/auth/sign-in?next=/pricing";
        return;
      }

      if (!res.ok) {
        setStatus("unavailable");
        return;
      }

      const data: CheckoutResponse = await res.json().catch(() => ({}));

      if (data.configured === false) {
        setStatus("unavailable");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setStatus("unavailable");
    } catch {
      setStatus("error");
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
      {status === "unavailable" &&
        (waitlistStatus === "success" ? (
          <p className="text-center text-xs text-dim">
            You&rsquo;re on the list. We&rsquo;ll tell you the moment billing opens.
          </p>
        ) : (
          <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-2">
            <p className="text-center text-xs text-dim">
              Billing opens soon. Leave your email and we&rsquo;ll tell you the moment it does.
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email for the billing waitlist"
              className="input"
            />
            <button type="submit" disabled={waitlistStatus === "loading"} className="btn btn-ghost">
              {waitlistStatus === "loading" ? "Sending…" : "Notify me"}
            </button>
            {waitlistStatus === "error" && (
              <p className="text-center text-xs text-dim">
                Something didn&rsquo;t connect. Try again in a moment.
              </p>
            )}
          </form>
        ))}
      {status === "error" && (
        <p className="text-center text-xs text-dim">
          Something didn&rsquo;t connect. Try again in a moment.
        </p>
      )}
    </div>
  );
}
