/**
 * Honest free vs paid labeling for ask-about-this-verdict notes.
 * Does not gate access; server entitlements + /api/advisor remain authoritative.
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
 * Brand Use chip copy. Never names a SKU "Companion".
 * Free: rule-based notes. Plus+: ask about this verdict.
 */
export function companionTierCopy(input: CompanionTierCopyInput): CompanionTierCopy {
  if (input.advisorRealModel) {
    return {
      kind: "paid",
      summary: "Ask about this verdict.",
    };
  }

  const daily =
    Number.isFinite(input.advisorMessagesPerDay) && input.advisorMessagesPerDay > 0
      ? input.advisorMessagesPerDay
      : 5;

  return {
    kind: "free",
    summary: "Rule-based notes on this verdict.",
    detail: `${daily} messages/day`,
    upgradeHref: "/pricing",
    upgradeLabel: "Upgrade",
  };
}
