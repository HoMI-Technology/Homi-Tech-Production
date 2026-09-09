import Link from "next/link";
import { COLORS } from "@/lib/brand";
import { SIGNED_IN_ASSESS_HREF } from "@/components/marketing/first-moment-copy";
import { HomeV4HomiRail } from "@/components/v4/HomeV4HomiRail";
import type { HomeV4View } from "@/lib/v4/home-state";

/**
 * HOME_CRAFT v4 State A — hard-stop ACTIVE + empty money.
 * Hierarchy: Decision context → Readiness hero → Decision evidence (three
 * pillars) → Current Path step → Money evidence → What changed → Contextual tools.
 * Greeting is in the shell command bar, not here.
 * Score/verdict from AssessmentResult only.
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
        <div className="workspace-grid" data-workspace-grid="">
          <div data-workspace-main="" className="space-y-4">
            <p
              className="text-2xs font-semibold uppercase tracking-[0.08em] text-dim"
              data-home-v4-context=""
            >
              {view.decisionContext ?? "No decision read yet"}
            </p>

            <section
              className="home-readiness-hero rounded-2xl border border-white/[0.06] bg-navy-light/40 p-5 sm:p-6"
              data-home-v4-readiness=""
            >
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
              <section className="mt-4" data-home-v4-evidence="" aria-label="Decision evidence">
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
                  Decision evidence
                </p>
                <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {view.pillars.map((pillar) => (
                    <li
                      key={pillar.id}
                      data-home-v4-pillar={pillar.id}
                      data-home-v4-pillar-status={pillar.status}
                      className="rounded-xl border border-white/[0.04] bg-navy-light/50 px-3 py-2.5"
                    >
                      <p className="text-sm font-medium text-light">{pillar.title}</p>
                      <p className="mt-0.5 text-xs text-dim">{pillar.status}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section data-home-v4-path-step="" aria-label="Current Path step">
              <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
                Current Path step
              </p>
              {view.pathPrimary ? (
                <p className="mt-3 text-sm text-light/85">
                  <Link href={view.pathPrimary.href} className="hover:text-cyan">
                    {view.pathPrimary.title}
                  </Link>
                </p>
              ) : (
                <p className="mt-3 text-sm text-dim">Path appears after a read.</p>
              )}
            </section>

            <section data-home-v4-money="" aria-label="Money evidence">
              <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
                Money evidence
              </p>
              <p className="mt-3 text-sm text-dim" data-home-v4-money-empty="">
                {view.moneyLine}
              </p>
              <p className="mt-3">
                <Link
                  href={view.connectHref}
                  className="btn rounded-full border border-cyan bg-transparent text-cyan shadow-none"
                  data-home-v4-connect=""
                >
                  {view.connectLabel}
                </Link>
              </p>
            </section>

            <section data-home-v4-changed="" aria-label="What changed">
              <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">What changed</p>
              <p className="mt-3 text-sm text-dim">
                {view.whatChanged ?? "Nothing to compare until a read lands."}
              </p>
            </section>

            <section data-home-v4-tools="" aria-label="Contextual tools">
              <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
                Contextual tools
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {view.tools.map((tool) => (
                  <li key={tool.id}>
                    <Link
                      href={tool.href}
                      className="block rounded-xl border border-white/[0.03] bg-navy-light/40 p-3 text-sm text-dim"
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
