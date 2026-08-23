/**
 * Honest free vs paid labeling for ask-about-this-verdict notes.
 * Does not gate access; server entitlements + /api/advisor remain authoritative.
 */

export type CompanionTierCopyInput = {
  /** True only when the account's tier grants the real model (Plus+). */
  advisorRealModel: boolean;
  /** Daily message cap from entitlements (free = 5). */
  advisorMessagesPerDay: number;
  /**
   * Live remaining counts when the usage read succeeded. Null or omitted means we
   * genuinely don't know — show the cap alone, never a guessed remainder.
   */
  remainingToday?: number | null;
  remainingThisMonth?: number | null;
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
    detail: remainingDetail(input, daily),
    upgradeHref: "/pricing",
    upgradeLabel: "Upgrade",
  };
}

/**
 * Show what's actually left, so running out is expected rather than abrupt.
 *
 * Reports whichever allowance is scarcer: the monthly cap binds before month-end at
 * daily-cap usage on every tier, so "left today" alone can read as reassuring on the
 * very day the month runs dry. Falls back to the bare cap when usage is unknown.
 */
function remainingDetail(input: CompanionTierCopyInput, daily: number): string {
  const today = input.remainingToday;
  const month = input.remainingThisMonth;

  if (typeof month === "number" && (typeof today !== "number" || month <= today)) {
    return `${month} message${month === 1 ? "" : "s"} left this month`;
  }

  if (typeof today === "number") {
    return `${today} of ${daily} messages left today`;
  }

  return `${daily} messages/day`;
}
