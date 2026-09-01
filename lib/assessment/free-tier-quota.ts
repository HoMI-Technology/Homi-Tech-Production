/**
 * Plans.md D10 — free-tier quota × verticals.
 *
 * Policy: one completed non-shadow assessment per decision type on free.
 * Re-scoring the same vertical is Plus+. A home verdict must not consume
 * the first taste of car (or any later vertical).
 */

export const FREE_TIER_QUOTA_POLICY = "one_per_vertical" as const;

export const FREE_TIER_LOCKED_CODE = "rescoring_locked" as const;

export const FREE_TIER_LOCKED_MESSAGE =
  "Your free plan includes one completed assessment per decision. Upgrade to re-score this decision as your numbers change.";

export function freeTierQuotaExceeded(input: {
  unlimitedRescoring: boolean;
  completedCountForVertical: number;
}): boolean {
  if (input.unlimitedRescoring) return false;
  return input.completedCountForVertical >= 1;
}

export function freeTierOverflowAfterInsert(input: {
  unlimitedRescoring: boolean;
  completedCountForVertical: number;
}): boolean {
  if (input.unlimitedRescoring) return false;
  return input.completedCountForVertical > 1;
}
