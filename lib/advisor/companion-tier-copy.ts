/**
 * Honest Companion tier labeling — pure display copy for free (rule-based,
 * daily-limited) vs paid (full AI) tiers. Does not gate access; server
 * entitlements + /api/advisor remain authoritative.
 */

export type CompanionTierCopyInput = {
  /** True only when the account's tier grants the real model (Plus+). */
  advisorRealModel: boolean;
  /** Daily message cap from entitlements (free = 5). */
  advisorMessagesPerDay: number;
};

export type CompanionTierCopy = {
  kind: "free" | "paid";
  /** Short chip / banner summary. */
  summary: string;
  /** Optional secondary line (limits + upgrade nudge). */
  detail?: string;
  upgradeHref?: string;
  upgradeLabel?: string;
};

/**
 * Build display strings for the Companion free vs paid honesty chip.
 * Free never claims "AI Companion"; paid claims full AI without inventing
 * a model name.
 */
export function companionTierCopy(input: CompanionTierCopyInput): CompanionTierCopy {
  if (input.advisorRealModel) {
    return {
      kind: "paid",
      summary: "Full AI Companion",
    };
  }

  const daily =
    Number.isFinite(input.advisorMessagesPerDay) && input.advisorMessagesPerDay > 0
      ? input.advisorMessagesPerDay
      : 5;

  return {
    kind: "free",
    summary: "Free plan: limited rule-based Companion",
    detail: `${daily} messages/day · Upgrade for full AI`,
    upgradeHref: "/pricing",
    upgradeLabel: "Upgrade",
  };
}
