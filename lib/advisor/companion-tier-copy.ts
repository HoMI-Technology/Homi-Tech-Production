/**
 * Honest Decision Companion tier labeling — pure display copy for free
 * (Clarity voice, no picker) vs paid (voice picker). Does not gate access;
 * server entitlements + /api/advisor remain authoritative.
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
 * Build display strings for the free vs paid honesty chip.
 * Never names a SKU "Companion". Product noun "Decision Companion" is allowed.
 * Free is Clarity voice (no picker). Paid is the voice picker.
 */
export function companionTierCopy(input: CompanionTierCopyInput): CompanionTierCopy {
  if (input.advisorRealModel) {
    return {
      kind: "paid",
      summary: "Decision Companion",
    };
  }

  const daily =
    Number.isFinite(input.advisorMessagesPerDay) && input.advisorMessagesPerDay > 0
      ? input.advisorMessagesPerDay
      : 5;

  return {
    kind: "free",
    summary: "Clarity voice",
    detail: `${daily} messages/day · Upgrade for the voice picker`,
    upgradeHref: "/pricing",
    upgradeLabel: "Upgrade",
  };
}
