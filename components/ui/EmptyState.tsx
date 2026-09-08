import Link from "next/link";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import {
  PRIMARY_CLOSE_LABEL,
  SIGNED_IN_ASSESS_HREF,
} from "@/components/marketing/first-moment-copy";

type EmptyStatePreset = "journal" | "calendar" | "dashboard" | "signals";

interface PresetCopy {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

/** Calm, protective default copy per surface — used when only `preset` is passed. */
const PRESETS: Record<EmptyStatePreset, PresetCopy> = {
  journal: {
    title: "No decisions logged yet",
    body: "Log the decision before you make it. A short note now is worth more than a perfect memory later.",
  },
  calendar: {
    title: "Nothing on the calendar yet",
    body: "Add a milestone, deadline, or review — the moments worth tracking as your readiness changes.",
  },
  dashboard: {
    // Signed-in first-run Home: one close only — Assess → /assessment.
    // Marketing First Moment (/first-moment) is for guests; this preset is
    // only mounted on the authenticated dashboard empty state.
    title: "One measurement and this page comes alive",
    body: "Get a three-pillar read — Financial Reality, Emotional Truth, Perfect Timing — and this page will have a build to show.",
    actionHref: SIGNED_IN_ASSESS_HREF,
    actionLabel: PRIMARY_CLOSE_LABEL,
  },
  signals: {
    title: "No signals yet",
    body: "Take the assessment to get your first read. Once you have a result, this page will surface what's actually worth watching — hard-stops, weak spots, and pressure signals.",
    actionHref: "/assessment",
    actionLabel: "Take the assessment",
  },
};

/**
 * Icon-free empty state — a small static ThresholdCompass anchors the
 * visual instead of an icon library. Props always override preset defaults
 * when provided.
 */
export function EmptyState({
  preset,
  title,
  body,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  tone = "default",
}: {
  preset?: EmptyStatePreset;
  title?: string;
  body?: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  /** Operate role homes: no compass in the page body, Inter not Fraunces. */
  tone?: "default" | "operate";
}) {
  const defaults = preset ? PRESETS[preset] : undefined;
  const resolvedTitle = title ?? defaults?.title ?? "Nothing here yet";
  const resolvedBody = body ?? defaults?.body;
  const resolvedHref = actionHref ?? defaults?.actionHref;
  const resolvedLabel = actionLabel ?? defaults?.actionLabel;
  const resolvedSecondaryHref = secondaryHref ?? defaults?.secondaryHref;
  const resolvedSecondaryLabel = secondaryLabel ?? defaults?.secondaryLabel;
  const operate = tone === "operate";

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {!operate && <ThresholdCompass size={56} animated={false} glow={false} />}
      <div>
        <h2 className={operate ? "text-xl font-medium text-light" : "font-display text-xl text-light"}>
          {resolvedTitle}
        </h2>
        {resolvedBody && (
          <p className="mt-3 max-w-md text-sm leading-relaxed text-dim">{resolvedBody}</p>
        )}
      </div>
      {resolvedHref && resolvedLabel && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href={resolvedHref} className={operate ? "btn btn-ghost" : "btn btn-primary"}>
            {resolvedLabel}
          </Link>
          {resolvedSecondaryHref && resolvedSecondaryLabel && (
            <Link href={resolvedSecondaryHref} className="btn btn-ghost">
              {resolvedSecondaryLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
