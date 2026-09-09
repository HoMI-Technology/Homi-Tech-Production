import Link from "next/link";
import {
  HOME_ASK_HOMI_LABEL,
  HOME_COMPANION_GUIDANCE,
  HOME_COMPANION_HEADING,
  HOME_COMPANION_PROMPTS,
  HOME_COMPANION_TAGLINE,
  HOME_QUICK_ACTIONS,
  HOME_RECENT_EMPTY,
} from "@/lib/dashboard/fold-truth";
import { COLORS } from "@/lib/brand";

/**
 * Home insight column — Trinity-skinned Companion, not a Homie launch cast.
 */
export function HomeCompanionColumn() {
  return (
    <aside
      className="home-companion-column space-y-6 rounded-2xl border border-white/[0.04] bg-navy-light/40 p-5"
      data-home-companion-column=""
      aria-label="Companion"
    >
      <section data-home-companion-ask="">
        <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
          {HOME_COMPANION_HEADING}
        </p>
        <p className="mt-2 text-sm text-light/85" data-home-companion-tagline="">
          {HOME_COMPANION_TAGLINE}
        </p>
        <p className="mt-1 text-xs text-dim" data-home-companion-guidance="">
          {HOME_COMPANION_GUIDANCE}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-2xl border border-white/[0.06]"
            data-home-companion-trinity=""
          >
            <svg viewBox="0 0 36 36" className="size-8" fill="none">
              <circle cx="18" cy="12" r="5" stroke={COLORS.cyan} strokeWidth="1.5" />
              <circle cx="10" cy="24" r="5" stroke={COLORS.emerald} strokeWidth="1.5" />
              <circle cx="26" cy="24" r="5" stroke={COLORS.yellow} strokeWidth="1.5" />
            </svg>
          </span>
          <Link
            href="/advisor"
            className="btn btn-ghost flex-1"
            data-home-companion-ask-cta=""
          >
            {HOME_ASK_HOMI_LABEL} →
          </Link>
        </div>
      </section>

      <section data-home-companion-prompts="" aria-label="Suggested prompts">
        <ul className="space-y-2">
          {HOME_COMPANION_PROMPTS.map((prompt) => (
            <li key={prompt.label}>
              <Link
                href={prompt.href}
                className="block rounded-xl border border-white/[0.04] px-3 py-2 text-sm text-light/85 hover:border-cyan/40 hover:text-cyan"
                data-home-companion-prompt=""
              >
                {prompt.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section data-home-companion-quick="" aria-label="Quick actions">
        <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
          Quick actions
        </p>
        <ul className="mt-2 space-y-1">
          {HOME_QUICK_ACTIONS.map((action) => (
            <li key={action.href}>
              <Link
                href={action.href}
                className="text-sm text-dim underline-offset-2 hover:text-cyan hover:underline"
                data-home-companion-quick-action=""
              >
                {action.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section data-home-companion-recent="" aria-label="Recent activity">
        <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
          Recent activity
        </p>
        <p className="mt-2 text-sm text-dim" data-home-recent-empty="">
          {HOME_RECENT_EMPTY}
        </p>
      </section>
    </aside>
  );
}
