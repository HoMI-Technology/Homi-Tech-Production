import Link from "next/link";
import {
  HOME_JOURNEY_HEADING,
  HOME_JOURNEY_HISTORY_HREF,
  HOME_JOURNEY_HISTORY_LABEL,
  type HomeJourneyStage,
  type HomeJourneyTone,
} from "@/lib/dashboard/fold-truth";

function toneClass(tone: HomeJourneyTone): string {
  switch (tone) {
    case "done":
      return "border-cyan/50 text-cyan";
    case "current":
      return "border-amber/60 text-amber";
    case "next":
      return "border-white/15 text-light/80";
    case "future":
      return "border-white/[0.08] text-dim";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

/**
 * Journey LOOK chrome — Assess→Build→Prepare→Buy strip near the fold.
 * Stages are not invent-completed. Hard stop keeps Build current — never On track / READY.
 */
export function HomeJourney({ stages }: { stages: readonly HomeJourneyStage[] }) {
  return (
    <section className="mt-3" data-home-journey="" aria-label={HOME_JOURNEY_HEADING}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
          {HOME_JOURNEY_HEADING}
        </p>
        <Link
          href={HOME_JOURNEY_HISTORY_HREF}
          className="text-sm text-dim underline underline-offset-2 hover:text-cyan"
          data-home-journey-history=""
        >
          {HOME_JOURNEY_HISTORY_LABEL} →
        </Link>
      </div>
      <ol className="home-journey home-journey-strip mt-2 flex items-stretch gap-1">
        {stages.map((stage, index) => (
          <li
            key={stage.id}
            data-home-journey-stage={stage.id}
            data-home-journey-tone={stage.tone}
            className="flex min-w-0 flex-1 items-center gap-1"
          >
            <div className={`min-w-0 flex-1 rounded-xl border px-2.5 py-2 ${toneClass(stage.tone)}`}>
              <p className="truncate text-sm font-medium">{stage.label}</p>
              <p className="mt-0.5 truncate text-xs text-dim">{stage.hint}</p>
            </div>
            {index < stages.length - 1 ? (
              <span aria-hidden className="shrink-0 text-xs text-dim">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
