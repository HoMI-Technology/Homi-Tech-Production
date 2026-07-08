import Link from "next/link";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";

type EmptyStatePreset = "journal" | "calendar" | "dashboard" | "signals";

interface PresetCopy {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
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
    title: "You haven't taken your assessment yet",
    body: "Three pillars, one honest verdict: Financial Reality, Emotional Truth, and Perfect Timing. It takes about ten minutes and gives you a real answer.",
    actionHref: "/assessment",
    actionLabel: "Start your assessment",
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
}: {
  preset?: EmptyStatePreset;
  title?: string;
  body?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  const defaults = preset ? PRESETS[preset] : undefined;
  const resolvedTitle = title ?? defaults?.title ?? "Nothing here yet";
  const resolvedBody = body ?? defaults?.body;
  const resolvedHref = actionHref ?? defaults?.actionHref;
  const resolvedLabel = actionLabel ?? defaults?.actionLabel;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <ThresholdCompass size={56} animated={false} glow={false} />
      <div>
        <h2 className="font-display text-xl text-light">{resolvedTitle}</h2>
        {resolvedBody && <p className="mt-3 max-w-md text-sm leading-relaxed text-dim">{resolvedBody}</p>}
      </div>
      {resolvedHref && resolvedLabel && (
        <Link href={resolvedHref} className="btn btn-primary mt-2">
          {resolvedLabel}
        </Link>
      )}
    </div>
  );
}
