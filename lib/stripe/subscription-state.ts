/**
 * Helpers for deciding whether a profile may start a new Stripe Checkout
 * subscription. Stripe is the money ledger; profiles are the access ledger —
 * this file only interprets the access ledger for *double-checkout prevention*.
 */

import type { SubscriptionTier } from "@/types/database";

/** Statuses that mean the user already has a billing relationship that must
 *  be managed via the Customer Portal (upgrade/downgrade/cancel), not a
 *  second Checkout session that could create a duplicate subscription. */
const ACTIVE_BILLING_STATUSES = new Set([
  "active",
  "trialing",
  "cancelling", // cancel_at_period_end — still entitled; change via portal
  "past_due",
  "unpaid",
  "incomplete", // SCA in flight — do not open a second session
]);

const PAID_TIERS = new Set<SubscriptionTier>(["plus", "pro", "family"]);

/**
 * True when starting Checkout would risk a second concurrent subscription.
 * Fail closed: unknown paid tier + active-ish status blocks Checkout.
 */
export function hasActivePaidSubscription(
  tier: string | null | undefined,
  status: string | null | undefined,
): boolean {
  const t = (tier ?? "free").toLowerCase() as SubscriptionTier;
  if (!PAID_TIERS.has(t)) return false;

  const s = (status ?? "active").toLowerCase();
  // Paid tier with empty/unknown status: treat as active (webhook may lag on status only).
  if (!status || status === "") return true;
  if (s === "cancelled" || s === "canceled" || s === "free") return false;
  return ACTIVE_BILLING_STATUSES.has(s);
}
