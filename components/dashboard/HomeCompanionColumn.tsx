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
 * Home insight column — Companion chat LOOK. Local guidance, not live AI.
 * Theater is a glowing sphere + composer, not the Trinity three-circle mark.
 */
export function HomeCompanionColumn() {
  return (
    <aside
      className="home-companion-column isolate overflow-hidden space-y-6 rounded-2xl border border-white/[0.04] bg-navy-light/40 p-5"
      data-home-companion-column=""
      aria-label="Companion"
    >
      <section data-home-companion-ask="" data-home-companion-theater="">
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
            className="home-companion-orb flex size-14 items-center justify-center rounded-full"
            data-home-companion-trinity=""
            data-home-companion-orb=""
          >
            <svg viewBox="0 0 48 48" className="size-12" fill="none">
              <defs>
                <radialGradient id="homie-orb-fill" cx="38%" cy="32%" r="68%">
                  <stop offset="0%" stopColor={COLORS.light} stopOpacity="0.95" />
                  <stop offset="28%" stopColor={COLORS.cyan} stopOpacity="0.9" />
                  <stop offset="72%" stopColor={COLORS.cyan} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={COLORS.cyan} stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="24" cy="24" r="18" fill="url(#homie-orb-fill)" />
              <circle cx="24" cy="24" r="13" stroke={COLORS.cyan} strokeOpacity="0.55" strokeWidth="1.25" />
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
        <Link
          href="/advisor"
          className="home-companion-composer mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-navy/55 px-3 py-2 text-sm text-dim hover:border-cyan/40 hover:text-cyan"
          data-home-companion-composer=""
        >
          <span className="min-w-0 flex-1 truncate">{HOME_ASK_HOMI_LABEL}…</span>
          <span aria-hidden className="text-cyan">
            →
          </span>
        </Link>
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
