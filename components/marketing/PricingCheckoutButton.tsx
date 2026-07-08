"use client";

import { useState } from "react";

export type PricingTier = "plus" | "pro" | "family";

interface CheckoutResponse {
  configured?: boolean;
  url?: string;
}

/**
 * Posts to /api/checkout with the selected tier. That route is owned by
 * another workstream — this component only calls it defensively. If the
 * endpoint is missing, unreachable, or reports { configured: false }, we
 * show an inline "Billing opens soon" notice instead of erroring.
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

  async function handleClick() {
    setStatus("loading");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

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
      {status === "unavailable" && (
        <p className="text-center text-xs text-dim">
          Billing opens soon. Join the list and we&rsquo;ll tell you the moment it does.
        </p>
      )}
      {status === "error" && (
        <p className="text-center text-xs text-dim">
          Something didn&rsquo;t connect. Try again in a moment.
        </p>
      )}
    </div>
  );
}
