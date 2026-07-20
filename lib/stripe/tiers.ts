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
      "Full assessment with detailed pillar breakdowns",
      "Unlimited re-scoring as your numbers change",
      "Full AI Companion conversations",
      "Progress tracking over time",
    ],
  },
  pro: {
    key: "pro",
    name: "HōMI Pro",
    priceMonthlyUsd: 24.99,
    lookupKey: "homi_pro_monthly",
    priceEnvVar: "STRIPE_PRICE_PRO",
    features: [
      "Everything in Plus",
      "Advanced finance tools (mortgage, debt payoff modeling)",
      "Higher daily Companion limits",
      "Couples mode — shared readiness view",
      "Decision journal with outcome tracking",
    ],
  },
  family: {
    key: "family",
    name: "HōMI Family",
    priceMonthlyUsd: 39.99,
    lookupKey: "homi_family_monthly",
    priceEnvVar: "STRIPE_PRICE_FAMILY",
    features: [
      "Everything in Pro",
      "Up to 5 linked household members",
      "Shared assessments and joint verdicts",
      "Family financial reality dashboard",
      "Dedicated onboarding walkthrough",
    ],
  },
};

export function getTier(key: string): Tier | undefined {
  return (TIERS as Record<string, Tier>)[key];
}
