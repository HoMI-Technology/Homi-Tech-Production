"use client";

import { track } from "@/lib/analytics";
import { useEffect } from "react";

export type QuotaNoticeData = {
  scope: "daily" | "monthly" | null;
  title: string;
  resetsAt: string | null;
  canUpgrade: boolean;
  upgradeHref?: string;
  upgradeLabel?: string;
  nextTierName?: string;
};

/**
 * The over-quota moment, rendered as product chrome rather than a chat turn.
 *
 * ADR-003 puts the Companion character where the job is warmth and attention, and
 * keeps it out of surfaces whose job is authority. Asking someone for money is not
 * warmth — so this deliberately sits outside the message list, carries no avatar,
 * and does not speak in first person. The conversation stays the conversation.
 *
 * Reset instants arrive as UTC ISO from the server and are formatted in the viewer's
 * own timezone here; the server never claims a wall-clock time it can't know.
 *
 * NO UPGRADE CTA, deliberately. `homi-product-ui` lists "conversion CTAs" as forbidden
 * on the Companion surface, and the founder took the strict reading on 2026-08-23. The
 * notice states what happened and when it lifts; the user reaches pricing through
 * normal navigation if they want it. `canUpgrade` / `nextTierName` stay on the payload
 * because non-Companion surfaces (UpgradePanel on tools and report pages) are still
 * allowed to sell — the rule is scoped to this surface, so the suppression lives here
 * rather than in lib/advisor/quota-copy.ts.
 */
export function QuotaNotice({
  data,
  onDismiss,
  className = "mx-4 mb-2",
}: {
  data: QuotaNoticeData;
  onDismiss: () => void;
  /** Host controls placement — the widget and the full-page chat frame differ. */
  className?: string;
}) {
  useEffect(() => {
    track("quota_notice_shown", {
      scope: data.scope ?? "unknown",
      can_upgrade: data.canUpgrade ? 1 : 0,
    });
  }, [data.scope, data.canUpgrade]);

  return (
    <div
      role="status"
      data-quota-notice={data.scope ?? "unknown"}
      className={`${className} rounded-xl border border-slate-surface/70 bg-slate-surface/30 px-4 py-3`}
    >
      <p className="text-sm font-medium text-light">{data.title}</p>

      {data.resetsAt && (
        <p className="mt-1 text-xs text-dim">{formatReset(data.scope, data.resetsAt)}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onDismiss} className="btn btn-ghost btn-xs">
          Dismiss
        </button>
      </div>
    </div>
  );
}

/**
 * The reset is an *instant*, not a calendar day, so it always carries a time.
 *
 * This matters more than it looks. The quota rolls at Postgres `current_date`
 * (UTC midnight), which in US Eastern is 8:00 PM the *previous* evening. Formatting
 * a monthly reset as a bare date therefore produced "You've used this month's
 * messages. Resets Aug 31." — a monthly reset apparently landing inside the same
 * month. Correct to the millisecond and unreadable as English. Showing the clock
 * time removes the ambiguity for every zone west of UTC.
 */
function formatReset(scope: "daily" | "monthly" | null, iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";

  // Monthly waits can be weeks out, so name the date. Daily is inside 24h, so the
  // weekday reads better than a date.
  const dayPart: Intl.DateTimeFormatOptions =
    scope === "monthly" ? { month: "short", day: "numeric" } : { weekday: "short" };

  return `Resets ${new Intl.DateTimeFormat(undefined, {
    ...dayPart,
    hour: "numeric",
    minute: "2-digit",
  }).format(when)}.`;
}
