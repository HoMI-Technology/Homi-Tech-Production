import Link from "next/link";
import { COLORS } from "@/lib/brand";
import { SIGNED_IN_ASSESS_HREF } from "@/components/marketing/first-moment-copy";
import { HomeV4HomiRail } from "@/components/v4/HomeV4HomiRail";
import type { HomeV4View } from "@/lib/v4/home-state";

/**
 * HOME_CRAFT v4 State A — hard-stop ACTIVE + empty money.
 * Ultra Premium hierarchy: Decision context → Readiness hero → Decision
 * evidence → Path step → Money evidence → What changed → Contextual tools.
 * Score is a proprietary instrument, not the Compass. No “% ready”.
 */
export function HomeV4({ view }: { view: HomeV4View }) {
  const scoreLabel =
    view.scorePct != null
      ? `Overall Decision Readiness Score ${view.scorePct} out of 100`
      : "Decision Readiness Score unknown";
  const verdictIsHold = view.verdictKey === "NOT_YET";

  return (
    <div className="dash-instrument" data-home-v4="" data-home-state={view.hasAssessment ? "read" : "empty"}>
      <div className="dash-instrument-inner px-4 py-5 sm:px-6 sm:py-6">
        <div className="v4-home-grid" data-workspace-grid="">
          <div data-workspace-main="" className="space-y-6">
            <p
              className="text-2xs font-semibold uppercase tracking-[0.08em] text-dim"
              data-home-v4-context=""
            >
              {view.decisionContext ?? "No decision read yet"}
            </p>

            <section data-home-v4-readiness="" aria-label="Readiness">
              {view.hasAssessment ? (
                <>
                  <p className="flex flex-wrap items-baseline gap-x-3" data-home-v4-score-plate="">
                    <span
                      className="score-numeral type-fold-score tabular-nums text-light"
                      aria-label={scoreLabel}
                      data-home-v4-score=""
                    >
                      {view.scorePct != null ? view.scorePct : "\u2014"}
                    </span>
                    {view.scoreAge ? (
                      <span className="text-sm text-dim" data-home-v4-age="">
                        {view.scoreAge}
                      </span>
                    ) : null}
                  </p>
                  {view.verdictLabel ? (
                    <p
                      className="type-fold-verdict mt-3"
                      data-home-v4-verdict=""
                      style={{ color: verdictIsHold ? COLORS.crimson : COLORS.light }}
                    >
                      {view.verdictLabel}
                    </p>
                  ) : null}
                  {view.hardStopActive ? (
                    <div className="mt-4 space-y-2" role="alert" data-home-v4-hard-stop="">
                      {view.hardStopEyebrow ? (
                        <p className="type-fold-hardstop uppercase tracking-[0.08em] text-light">
                          {view.hardStopEyebrow}
                        </p>
                      ) : null}
                      <p className="text-sm text-amber" data-home-v4-runway="">
                        Runway {view.runwayLabel}
                      </p>
                      {view.holdSentence ? (
                        <p className="type-fold-hold text-light/90" data-home-v4-hold="">
                          {view.holdSentence}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mt-4">
                    {view.pathPrimary ? (
                      <Link
                        href={view.pathPrimary.href}
                        className="btn btn-ghost shadow-none"
                        data-home-v4-path-cta=""
                      >
                        {view.pathPrimary.title}
                      </Link>
                    ) : (
                      <Link href={SIGNED_IN_ASSESS_HREF} className="btn btn-ghost shadow-none">
                        Assess
                      </Link>
                    )}
                  </p>
                </>
              ) : (
                <div data-home-v4-empty="">
                  <p
                    className="score-numeral type-fold-score tabular-nums text-light"
                    aria-label={scoreLabel}
                    data-home-v4-score=""
                  >
                    {"\u2014"}
                  </p>
                  <p className="mt-4 text-sm text-dim">No assessment yet. One read paints this page.</p>
                  <p className="mt-4">
                    <Link href={SIGNED_IN_ASSESS_HREF} className="btn btn-ghost shadow-none" data-home-v4-assess="">
                      Assess
                    </Link>
                  </p>
                </div>
              )}
            </section>

            {view.pillars.length === 3 ? (
              <section data-home-v4-evidence="" aria-label="Decision evidence">
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
                  Decision evidence
                </p>
                <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
                  {view.pillars.map((pillar) => (
                    <li
                      key={pillar.id}
                      data-home-v4-pillar={pillar.id}
                      data-home-v4-pillar-status={pillar.status}
                    >
                      <p className="text-sm font-medium text-light">{pillar.title}</p>
                      <p className="mt-0.5 text-xs text-dim">{pillar.status}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="space-y-5 border-t border-white/[0.06] pt-5" data-home-v4-fold="">
              <div data-home-v4-path-step="" aria-label="Current Path step">
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
                  Current Path step
                </p>
                {view.pathPrimary ? (
                  <p className="mt-2 text-sm text-light/85">
                    <Link href={view.pathPrimary.href} className="hover:text-light">
                      {view.pathPrimary.title}
                    </Link>
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-dim">Path appears after a read.</p>
                )}
              </div>

              <div data-home-v4-money="" aria-label="Money evidence">
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
                  Money evidence
                </p>
                <p className="mt-2 text-sm text-dim" data-home-v4-money-empty="">
                  {view.moneyLine}
                </p>
                <p className="mt-2">
                  <Link
                    href={view.connectHref}
                    className="text-sm text-cyan hover:text-light"
                    data-home-v4-connect=""
                  >
                    {view.connectLabel}
                  </Link>
                </p>
              </div>

              <div data-home-v4-changed="" aria-label="What changed">
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">What changed</p>
                <p className="mt-2 text-sm text-dim">
                  {view.whatChanged ?? "Nothing to compare until a read lands."}
                </p>
              </div>
            </section>

            <section data-home-v4-tools="" aria-label="Contextual tools">
              <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
                Contextual tools
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {view.tools.map((tool) => (
                  <li key={tool.id}>
                    <Link
                      href={tool.href}
                      className="text-sm text-dim hover:text-light"
                      data-home-v4-tool={tool.id}
                    >
                      {tool.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="hidden lg:block">
            <HomeV4HomiRail />
          </div>
        </div>

        <p className="mt-8 max-w-md text-xs leading-relaxed text-dim/80">
          Educational guidance only. Decision Readiness Score is the last AssessmentResult.
        </p>
      </div>
    </div>
  );
}
