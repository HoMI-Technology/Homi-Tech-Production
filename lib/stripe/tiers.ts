/**
 * HōMI subscription tiers. Single source of truth for pricing display,
 * Stripe lookup keys, and env var mapping to actual price IDs.
 */

export type TierKey = "plus" | "pro" | "family";

export interface Tier {
  key: TierKey;
  name: string;
  priceMonthlyUsd: number;
  lookupKey: string;
  /** Name of the env var (in lib/env.ts) that holds the live Stripe price ID. */
  priceEnvVar: "STRIPE_PRICE_PLUS" | "STRIPE_PRICE_PRO" | "STRIPE_PRICE_FAMILY";
  features: string[];
}

export const TIERS: Record<TierKey, Tier> = {
  plus: {
    key: "plus",
    name: "HōMI Plus",
    priceMonthlyUsd: 9.99,
    lookupKey: "homi_plus_monthly",
    priceEnvVar: "STRIPE_PRICE_PLUS",
    features: [
      "Verdict in your companion's voice (Steady, Clarity, or Horizon).",
      "Verdict history",
    ],
  },
  pro: {
    key: "pro",
    name: "HōMI Pro",
    priceMonthlyUsd: 24.99,
    lookupKey: "homi_pro_monthly",
    priceEnvVar: "STRIPE_PRICE_PRO",
    features: ["Everything in Plus", "Higher daily ask-about-this-verdict limits."],
  },
  family: {
    key: "family",
    name: "HōMI Family",
    priceMonthlyUsd: 39.99,
    lookupKey: "homi_family_monthly",
    priceEnvVar: "STRIPE_PRICE_FAMILY",
    features: [
      "Everything in Pro for two people",
      "The slower-person pillar sets the pace",
      "One compass for both",
    ],
  },
};

export function getTier(key: string): Tier | undefined {
  return (TIERS as Record<string, Tier>)[key];
}
