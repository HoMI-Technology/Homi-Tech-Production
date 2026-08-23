"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { TIERS } from "@/lib/stripe/tiers";
import { track } from "@/lib/analytics";

/**
 * Shown when a signed-in user lacks the tier capability for a feature.
 *
 * Deliberately absent, and not an oversight: no social proof, no countdown, no
 * "what you'll lose" framing, no per-day price rounding. HōMI has no published user
 * counts to cite, and manufactured urgency aimed at people deciding whether they can
 * afford a house is the register the safety canon rules out. What's here instead is
 * the honest set — what the feature is, what it costs, and a way back out.
 */
export function UpgradePanel({
  title = "Upgrade to unlock",
  body,
  feature,
  minTier = "plus",
  preview,
}: {
  title?: string;
  body: string;
  /** Short label for analytics / screen readers. */
  feature: string;
  /** Lowest tier that unlocks this capability. Drives the label and the price. */
  minTier?: "plus" | "pro" | "family";
  /**
   * A real, static look at what's behind the gate. Show only what actually exists —
   * a mock of something unbuilt would be a fabricated capability claim.
   */
  preview?: ReactNode;
}) {
  const tier = TIERS[minTier];
  const tierLabel = tier.name;
  const price = `$${tier.priceMonthlyUsd.toFixed(2)}/mo`;

  useEffect(() => {
    track("paywall_impression", { feature, min_tier: minTier });
  }, [feature, minTier]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-2xl items-center px-6 py-16">
      <div className="glass w-full p-10 text-center" data-feature-gate={feature}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan/10">
          <svg
            width="22"
            height="22"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="text-cyan"
            aria-hidden
          >
            <path d="M10 2l2.2 4.5 5 .7-3.6 3.5.9 5L10 13.8 5.5 15.7l.9-5L3 7.2l5-.7L10 2z" />
          </svg>
        </div>
        <h1 className="mt-5 font-display text-2xl text-light">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-dim">{body}</p>

        {preview && (
          <div
            aria-hidden
            className="pointer-events-none mt-6 select-none overflow-hidden rounded-xl border border-slate-surface/60 opacity-60"
          >
            {preview}
          </div>
        )}

        <p className="mt-6 text-sm text-light">
          {tierLabel} · <span className="text-dim">{price}</span>
        </p>
        <p className="mt-1 text-xs text-dim/80">Included with {tierLabel} and above.</p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/pricing"
            onClick={() => track("paywall_cta_click", { feature, min_tier: minTier })}
            className="btn btn-primary"
          >
            See plans
          </Link>
          <Link
            href="/dashboard"
            onClick={() => track("paywall_dismiss", { feature, min_tier: minTier })}
            className="btn btn-ghost"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
