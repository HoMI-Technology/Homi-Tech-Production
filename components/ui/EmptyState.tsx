import Link from "next/link";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";

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
    // First-run activation: the shortest path to a real score leads (Shadow
    // Score, ~2 minutes); the full assessment is the deeper second path.
    title: "One measurement and this page comes alive",
    body: "Get a first read in about two minutes with the Shadow Score — or go deep with the full three-pillar assessment: Financial Reality, Emotional Truth, Perfect Timing. Either way, you get an honest verdict, not a maybe.",
    actionHref: "/shadow-score",
    actionLabel: "Get your Shadow Score",
    secondaryHref: "/assessment",
    secondaryLabel: "Take the full assessment",
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
}: {
  preset?: EmptyStatePreset;
  title?: string;
  body?: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const defaults = preset ? PRESETS[preset] : undefined;
  const resolvedTitle = title ?? defaults?.title ?? "Nothing here yet";
  const resolvedBody = body ?? defaults?.body;
  const resolvedHref = actionHref ?? defaults?.actionHref;
  const resolvedLabel = actionLabel ?? defaults?.actionLabel;
  const resolvedSecondaryHref = secondaryHref ?? defaults?.secondaryHref;
  const resolvedSecondaryLabel = secondaryLabel ?? defaults?.secondaryLabel;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <ThresholdCompass size={56} animated={false} glow={false} />
      <div>
        <h2 className="font-display text-xl text-light">{resolvedTitle}</h2>
        {resolvedBody && <p className="mt-3 max-w-md text-sm leading-relaxed text-dim">{resolvedBody}</p>}
      </div>
      {resolvedHref && resolvedLabel && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href={resolvedHref} className="btn btn-primary">
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
