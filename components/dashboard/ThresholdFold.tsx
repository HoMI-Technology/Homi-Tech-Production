import type { CSSProperties } from "react";
import Link from "next/link";
import { COLORS, type VerdictKey } from "@/lib/brand";
import {
  HOME_FOLD_INSTRUMENT,
  HOME_READINESS_HEADING,
  HOME_SEE_FULL_ASSESSMENT,
  foldDensityPathTitles,
  foldHardStopEyebrow,
  foldHardStopEyebrowParts,
  foldHoldClose,
  foldHoldLead,
  foldHomeHoldSentence,
  foldScoreAgeLine,
  homeJourneyStages,
  resolveFoldPathPrimary,
  type FoldHardStopCode,
  type FoldPathPrimary,
} from "@/lib/dashboard/fold-truth";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import { HomeCompanionColumn } from "@/components/dashboard/HomeCompanionColumn";
import { HomeDensity } from "@/components/dashboard/HomeDensity";
import { HomeJourney } from "@/components/dashboard/HomeJourney";
import { HomeKeyAreas } from "@/components/dashboard/HomeKeyAreas";
import { HomeScoreGauge } from "@/components/dashboard/HomeScoreGauge";
import { LoadErrorPanel } from "@/components/dashboard/LoadErrorPanel";
import { ThresholdFoldEmptyClose } from "@/components/dashboard/ThresholdFoldEmptyClose";
import { verdictMetaFor } from "@/components/ui/verdict-ssot";
import { SIGNED_IN_ASSESS_HREF } from "@/components/marketing/first-moment-copy";
import { keyAreasFromReading } from "@/lib/dashboard/key-areas";

export type ThresholdFoldLatest = {
  id: string;
  overallScore: number | null;
  scoredAt?: string | null;
  financialScore?: number | null;
  emotionalScore?: number | null;
  timingScore?: number | null;
};

/**
 * Signed-in first screen inside PR10 left-rail chrome.
 * HOME_SCRAPE_CRAFT: readiness hero → journey strip → Key Factors → next/money → tools + companion.
 * Score is last AssessmentResult only. Compass never mounts here.
 */
export function ThresholdFold({
  assessmentsFailed,
  latest,
  verdict,
  stopMessages,
  stopCode = null,
  stopCodes,
  decisionType = "home_buying",
  lastMoney,
  pathPrimary,
  pathSteps,
}: {
  assessmentsFailed: boolean;
  latest: ThresholdFoldLatest | null;
  verdict: VerdictKey | null;
  stopMessages: string[];
  stopCode?: FoldHardStopCode | null;
  stopCodes?: readonly FoldHardStopCode[];
  decisionType?: string;
  lastMoney?: LastReadMoneyInputs | null;
  pathPrimary: FoldPathPrimary | null;
  pathSteps?: unknown;
}) {
  const scorePct =
    latest?.overallScore != null ? Math.round(latest.overallScore) : null;
  const hardStopActive = stopMessages.length > 0;
  const shownPath = resolveFoldPathPrimary(pathPrimary, stopCode);
  const pathTitles = foldDensityPathTitles(pathSteps);
  const holdSentence = foldHomeHoldSentence(stopCode, decisionType);
  const holdLead = holdSentence ? foldHoldLead(holdSentence) : null;
  const holdClose = holdSentence ? foldHoldClose(holdSentence) : null;
  const hardStopEyebrow = foldHardStopEyebrow(stopCode, decisionType);
  const hardStopParts = foldHardStopEyebrowParts(hardStopEyebrow);
  const scoreLabel =
    scorePct != null
      ? `Overall Decision Readiness Score ${scorePct} out of 100`
      : "Decision Readiness Score Unknown";
  const ageLine = latest ? foldScoreAgeLine(scorePct, latest.scoredAt) : null;
  const verdictMeta = verdict ? verdictMetaFor(verdict) : null;
  const instrumentStyle = {
    "--instrument-tint": COLORS.cyan,
  } as CSSProperties;
  const keyAreas = latest
    ? keyAreasFromReading({
        financialScore: latest.financialScore,
        emotionalScore: latest.emotionalScore,
        timingScore: latest.timingScore,
        runwayMonths: lastMoney?.emergencyFundMonths,
        stopCode,
        stopCodes,
        hardStopActive,
      })
    : [];
  const journeyStages = latest
    ? homeJourneyStages({ hasAssessment: true, hardStopActive })
    : [];

  return (
    <div
      className="dash-instrument"
      data-home-fold=""
      data-threshold-fold=""
      data-invent-chrome="pr13"
      data-home-instrument={latest ? HOME_FOLD_INSTRUMENT : "empty"}
      data-hard-stop={hardStopActive ? "1" : "0"}
      style={instrumentStyle}
    >
      <div className="dash-instrument-inner px-4 py-5 text-left sm:px-6 sm:py-6">
        {assessmentsFailed ? (
          <LoadErrorPanel
            title="Your readiness didn't load"
            body="Your assessments are safe - this is a loading hiccup on our side, not a change in your data."
          />
        ) : (
          <>
            {latest ? (
              <div className="workspace-grid" data-workspace-grid="">
                <div data-workspace-main="">
                  <section
                    className="home-readiness-hero rounded-2xl border border-white/[0.06] bg-navy-light/40 p-5 sm:p-6"
                    data-home-readiness-hero=""
                  >
                    <div className="home-readiness-hero-row">
                      <div className="min-w-0 max-w-xl" data-home-fold-column="">
                        <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-dim">
                          {HOME_READINESS_HEADING}
                        </p>
                        {verdictMeta ? (
                          <p
                            className="sr-only type-fold-verdict"
                            style={{ color: verdictMeta.color }}
                            data-home-fold-verdict=""
                            data-home-verdict=""
                            aria-label={verdictMeta.label}
                          >
                            {verdictMeta.label}
                          </p>
                        ) : null}

                        <p
                          data-home-fold-score-plate=""
                          className="mt-3 flex flex-wrap items-baseline gap-x-3"
                        >
                          <span
                            className="score-numeral type-fold-score tabular-nums text-light"
                            style={{ color: COLORS.light }}
                            aria-label={scoreLabel}
                            data-home-fold-score=""
                          >
                            {scorePct != null ? `${scorePct} / 100` : "\u2014"}
                          </span>
                          {ageLine ? (
                            <span className="text-sm text-dim" data-home-fold-age="">
                              {ageLine}
                            </span>
                          ) : null}
                        </p>

                        {hardStopActive ? (
                          <div
                            className="mt-4 flex max-w-xl flex-wrap items-center gap-x-3 gap-y-2"
                            role="alert"
                            data-home-hard-stop=""
                          >
                            <span className="home-hard-stop-pill" data-home-hard-stop-pill="">
                              <svg
                                aria-hidden
                                viewBox="0 0 16 16"
                                className="size-3.5 shrink-0 text-light"
                              >
                                <path
                                  fill="currentColor"
                                  d="M8.89 1.5a1 1 0 0 0-1.78 0L1.2 12.26A1 1 0 0 0 2.09 13.8h11.82a1 1 0 0 0 .89-1.54L8.89 1.5ZM8 6.2a.7.7 0 0 1 .7.7v2.3a.7.7 0 1 1-1.4 0V6.9A.7.7 0 0 1 8 6.2Zm0 5.5a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6Z"
                                />
                              </svg>
                              <span
                                className="type-fold-hardstop m-0 uppercase tracking-[0.08em] text-light"
                                data-home-hard-stop-eyebrow=""
                              >
                                {hardStopParts.lead}
                                {hardStopParts.accent ? (
                                  <span className="text-light">{hardStopParts.accent}</span>
                                ) : null}
                              </span>
                            </span>
                            {holdSentence ? (
                              <p
                                className="type-fold-hold text-amber"
                                data-home-hard-stop-hold=""
                              >
                                <span className="font-semibold">{holdLead}</span>
                                {holdClose ? (
                                  <>
                                    {" "}
                                    <span className="font-medium text-light/90">{holdClose}</span>
                                  </>
                                ) : null}
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        <p className="mt-4">
                          {shownPath ? (
                            <Link
                              href={shownPath.href}
                              className="btn btn-primary"
                              data-path-fold-primary=""
                            >
                              {shownPath.title} →
                            </Link>
                          ) : (
                            <Link href={SIGNED_IN_ASSESS_HREF} className="btn btn-primary">
                              Assess
                            </Link>
                          )}
                        </p>
                        {shownPath ? (
                          <p className="mt-3">
                            <Link
                              href={SIGNED_IN_ASSESS_HREF}
                              className="text-sm text-dim underline underline-offset-2 hover:text-cyan"
                              data-home-see-assessment=""
                            >
                              {HOME_SEE_FULL_ASSESSMENT}
                            </Link>
                          </p>
                        ) : null}
                      </div>

                      {scorePct != null ? (
                        <div className="shrink-0 justify-self-end" data-home-readiness-gauge="">
                          <HomeScoreGauge scorePct={scorePct} hardStopActive={hardStopActive} />
                        </div>
                      ) : null}
                    </div>
                  </section>

                  {journeyStages.length > 0 ? <HomeJourney stages={journeyStages} /> : null}

                  {keyAreas.length > 0 ? <HomeKeyAreas areas={keyAreas} /> : null}

                  <div data-home-money-below-fold="">
                    <HomeDensity lastMoney={lastMoney} pathTitles={pathTitles} />
                  </div>
                </div>

                <HomeCompanionColumn />
              </div>
            ) : (
              <div className="w-full max-w-[560px]" data-home-fold-column="">
                <p data-home-fold-score-plate="">
                  <span
                    className="score-numeral type-fold-score tabular-nums text-light"
                    style={{ color: COLORS.light }}
                    aria-label={scoreLabel}
                    data-home-fold-score=""
                  >
                    {"\u2014"}
                  </span>
                </p>
                <p className="mt-8">
                  <ThresholdFoldEmptyClose />
                </p>
              </div>
            )}

            <p className="mt-8 max-w-md text-xs leading-relaxed text-dim/80">
              Educational guidance only.{" "}
              <Link href="/legal/disclaimer" className="text-cyan underline-offset-2 hover:underline">
                Full disclaimer
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
