import Link from "next/link";
import { COLORS } from "@/lib/brand";
import { HOME_DENSITY_LENSES, HOME_DENSITY_WHATS_NEXT_HEADING } from "@/lib/dashboard/fold-truth";
import { KEY_AREA_STATUS, type KeyAreaStatus } from "@/lib/dashboard/key-areas";
import { SIGNED_IN_ASSESS_HREF } from "@/components/marketing/first-moment-copy";
import { HomeV4HomiRail } from "@/components/v4/HomeV4HomiRail";
import type { HomeV4View } from "@/lib/v4/home-state";

function statusAttr(status: KeyAreaStatus): "needs-work" | "strong" | "not-assessed" {
  switch (status) {
    case KEY_AREA_STATUS.needsWork:
      return "needs-work";
    case KEY_AREA_STATUS.strong:
      return "strong";
    case KEY_AREA_STATUS.notAssessed:
      return "not-assessed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * HOME_CRAFT v4 State A — hard-stop ACTIVE + empty money.
 * Greeting is in the shell command bar, not here.
 * Score/verdict from AssessmentResult only.
 */
export function HomeV4({ view }: { view: HomeV4View }) {
  const scoreLabel =
    view.scorePct != null
      ? `Overall Decision Readiness Score ${view.scorePct} out of 100`
      : "Decision Readiness Score unknown";

  return (
    <div className="dash-instrument" data-home-v4="" data-home-state={view.hasAssessment ? "read" : "empty"}>
      <div className="dash-instrument-inner px-4 py-5 sm:px-6 sm:py-6">
        <div className="workspace-grid" data-workspace-grid="">
          <div data-workspace-main="">
            <section
              className="home-readiness-hero rounded-2xl border border-white/[0.06] bg-navy-light/40 p-5 sm:p-6"
              data-home-v4-readiness=""
            >
              {view.hasAssessment ? (
                <>
                  {view.verdictLabel ? (
                    <p
                      className="type-fold-verdict text-light/80"
                      data-home-v4-verdict=""
                      style={{ color: COLORS.light }}
                    >
                      {view.verdictLabel}
                    </p>
                  ) : null}
                  <p className="mt-3 flex flex-wrap items-baseline gap-x-3" data-home-v4-score-plate="">
                    <span
                      className="score-numeral type-fold-score tabular-nums text-light"
                      aria-label={scoreLabel}
                      data-home-v4-score=""
                    >
                      {view.scorePct != null ? `${view.scorePct} / 100` : "\u2014"}
                    </span>
                    {view.scoreAge ? (
                      <span className="text-sm text-dim" data-home-v4-age="">
                        {view.scoreAge}
                      </span>
                    ) : null}
                  </p>
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
                      <Link href={view.pathPrimary.href} className="btn btn-primary" data-home-v4-path-cta="">
                        {view.pathPrimary.title}
                      </Link>
                    ) : (
                      <Link href={SIGNED_IN_ASSESS_HREF} className="btn btn-primary">
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
                    <Link href={SIGNED_IN_ASSESS_HREF} className="btn btn-primary" data-home-v4-assess="">
                      Assess
                    </Link>
                  </p>
                </div>
              )}
            </section>

            {view.keyAreas.length > 0 ? (
              <section className="mt-4" data-home-v4-keys="" aria-label="Key status">
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">Key status</p>
                <ul className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-3">
                  {view.keyAreas.map((area) => (
                    <li
                      key={area.id}
                      data-home-v4-key={area.id}
                      data-home-v4-key-status={statusAttr(area.status)}
                      className="rounded-xl border border-white/[0.04] bg-navy-light/50 px-3 py-2.5"
                    >
                      <p className="text-sm font-medium text-light">{area.title}</p>
                      <p className="mt-0.5 text-xs text-dim">{area.status}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <section data-home-v4-next="" aria-label={HOME_DENSITY_WHATS_NEXT_HEADING}>
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
                  {HOME_DENSITY_WHATS_NEXT_HEADING}
                </p>
                {view.whatsNext.length > 0 ? (
                  <ol className="mt-3 space-y-2 text-sm text-light/85">
                    {view.whatsNext.map((title, index) => (
                      <li key={title} className="flex gap-2">
                        <span className="text-dim tabular-nums">{index + 1}.</span>
                        <span>{title}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-dim">Path titles appear after a read.</p>
                )}
              </section>

              <section data-home-v4-money="" aria-label="Money">
                <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">Money</p>
                <p className="mt-3 text-sm text-dim" data-home-v4-money-empty="">
                  {view.moneyLine}
                </p>
                <p className="mt-3">
                  <Link
                    href={view.connectHref}
                    className="btn rounded-full border border-cyan bg-transparent text-cyan"
                    data-home-v4-connect=""
                  >
                    {view.connectLabel}
                  </Link>
                </p>
              </section>
            </div>

            <section className="mt-6" data-home-v4-tools="" aria-label="Tools">
              <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">Tools</p>
              <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {HOME_DENSITY_LENSES.slice(0, 3).map((lens) => (
                  <li key={lens.id}>
                    <Link
                      href={lens.href}
                      className="block rounded-xl border border-white/[0.03] bg-navy-light/40 p-3 text-sm text-dim"
                      data-home-v4-tool={lens.id}
                    >
                      {lens.title}
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
