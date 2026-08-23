import type { EntitlementTier } from "@/lib/entitlements";
import { TIERS, type TierKey } from "@/lib/stripe/tiers";
import type { QuotaScope } from "@/lib/advisor/usage";

/**
 * Copy for the over-quota moment.
 *
 * Three rules this file exists to hold:
 *  1. Never claim a reset window we haven't derived. `scope: null` means we couldn't
 *     read the counters, so the copy claims nothing specific.
 *  2. Never tell a top-tier subscriber to upgrade. Family has nothing above it.
 *  3. Never name a SKU "Companion" — matches lib/advisor/companion-tier-copy.ts.
 */
export type QuotaCopy = {
  /** Null when usage couldn't be read; the UI then omits any reset claim. */
  scope: QuotaScope | null;
  /** Complete, true sentence. Safe to use as the plain `error` string. */
  title: string;
  /** ISO instant the cap lifts. The client renders it in the viewer's own timezone. */
  resetsAt: string | null;
  canUpgrade: boolean;
  upgradeHref?: string;
  upgradeLabel?: string;
  /** Name of the next tier up, e.g. "HōMI Pro". Absent at top tier. */
  nextTierName?: string;
};

/** Ascending order. The last entry has nothing above it. */
const LADDER: TierKey[] = ["plus", "pro", "family"];

/** The next tier up, or null when the user is already at the top. */
export function nextTierUp(tier: EntitlementTier): TierKey | null {
  if (tier === "free") return "plus";
  const i = LADDER.indexOf(tier as TierKey);
  if (i < 0) return "plus";
  return LADDER[i + 1] ?? null;
}

export function overQuotaCopy(input: {
  scope: QuotaScope | null;
  resetsAt: string | null;
  tier: EntitlementTier;
}): QuotaCopy {
  const { scope, resetsAt, tier } = input;

  const title =
    scope === "monthly"
      ? "You've used this month's messages."
      : scope === "daily"
        ? "You've used today's messages."
        : "You've reached your message limit.";

  const next = nextTierUp(tier);

  if (!next) {
    // Top tier. There is nothing to sell; the reset time is the whole answer.
    return { scope, title, resetsAt, canUpgrade: false };
  }

  return {
    scope,
    title,
    resetsAt,
    canUpgrade: true,
    upgradeHref: "/pricing",
    upgradeLabel: "See plans",
    nextTierName: TIERS[next].name,
  };
}

/**
 * Human reset line for a quota instant, in the *viewer's* timezone.
 *
 * Always carries a clock time. The quota rolls at Postgres `current_date` (00:00 UTC,
 * verified), which is 8:00 PM US Eastern — so a bare date rendered a monthly reset as
 * "Resets Aug 31.", i.e. apparently inside the month that just ran out. Correct to the
 * millisecond and unreadable as English.
 *
 * Returns "" for a missing or unparseable instant so callers can concatenate safely.
 */
export function formatQuotaReset(scope: QuotaScope | null, iso: string | null): string {
  if (!iso) return "";
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";

  // Monthly waits run to weeks, so name the date. Daily is inside 24h, so the weekday
  // reads better than a date.
  const dayPart: Intl.DateTimeFormatOptions =
    scope === "monthly" ? { month: "short", day: "numeric" } : { weekday: "short" };

  return `Resets ${new Intl.DateTimeFormat(undefined, {
    ...dayPart,
    hour: "numeric",
    minute: "2-digit",
  }).format(when)}.`;
}
