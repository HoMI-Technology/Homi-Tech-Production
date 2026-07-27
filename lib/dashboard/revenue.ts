import { TIERS, type TierKey } from "@/lib/stripe/tiers";

export interface PaymentLike {
  amount: number;
  status: string;
  created_at: string;
}

/** Monthly list price per paid tier, in cents (from the pricing SSOT). */
export const TIER_MONTHLY_CENTS: Record<TierKey, number> = {
  plus: Math.round(TIERS.plus.priceMonthlyUsd * 100),
  pro: Math.round(TIERS.pro.priceMonthlyUsd * 100),
  family: Math.round(TIERS.family.priceMonthlyUsd * 100),
};

export type PaidTierCounts = Record<TierKey, number>;

/**
 * Estimated MRR in cents from active paid-subscriber counts × list price.
 * This is a list-price proxy (no proration/discounts) — the true figure comes
 * from Stripe subscription objects, but tier counts give a solid running MRR.
 * Callers MUST exclude comped/admin accounts (admins carry a 'family' tier via
 * the entitlements bypass and are not paying) before passing counts here.
 */
export function estimatedMrrCents(counts: PaidTierCounts): number {
  return (
    counts.plus * TIER_MONTHLY_CENTS.plus +
    counts.pro * TIER_MONTHLY_CENTS.pro +
    counts.family * TIER_MONTHLY_CENTS.family
  );
}

/** Total paying accounts across paid tiers. */
export function payingCount(counts: PaidTierCounts): number {
  return counts.plus + counts.pro + counts.family;
}

/** ARPU (per paying account) in cents; 0 when there are no payers. */
export function arpuCents(counts: PaidTierCounts): number {
  const payers = payingCount(counts);
  return payers > 0 ? Math.round(estimatedMrrCents(counts) / payers) : 0;
}

/** Free→paid conversion as a percentage of all accounts; 0 when no accounts. */
export function paidConversionPct(counts: PaidTierCounts, totalAccounts: number): number {
  if (totalAccounts <= 0) return 0;
  return Math.round((payingCount(counts) / totalAccounts) * 100);
}

/** Annual run-rate in cents = MRR × 12. */
export function arrCents(counts: PaidTierCounts): number {
  return estimatedMrrCents(counts) * 12;
}

export function sumSucceededCents(payments: PaymentLike[]): number {
  return payments
    .filter((p) => p.status === "succeeded")
    .reduce((acc, p) => acc + (Number.isFinite(p.amount) ? p.amount : 0), 0);
}

export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function dailySucceededCents(
  payments: PaymentLike[],
  days: number,
  now = new Date(),
): { date: string; cents: number }[] {
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const p of payments) {
    if (p.status !== "succeeded") continue;
    const key = p.created_at.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + p.amount);
    }
  }

  return Array.from(buckets.entries()).map(([date, cents]) => ({ date, cents }));
}
