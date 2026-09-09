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
  foldHomeHoldSentence,
  foldScoreAgeLine,
  resolveFoldPathPrimary,
  type FoldHardStopCode,
  type FoldPathPrimary,
} from "@/lib/dashboard/fold-truth";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import { HomeCompanionColumn } from "@/components/dashboard/HomeCompanionColumn";
import { HomeDensity } from "@/components/dashboard/HomeDensity";
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
 * HOME_SCRAPE_CRAFT: readiness hero (score + gauge) → Key Areas → next/money → tools + companion.
 * Score is last AssessmentResult only. Compass never mounts here.
 */
export function ThresholdFold({
  assessmentsFailed,
  latest,
  verdict,
  stopMessages,
  stopCode = null,
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
        hardStopActive,
      })
    : [];

  return (
    <div
      className="dash-instrument"
      data-home-fold=""
      data-threshold-fold=""
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
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                            <p
                              className="type-fold-hardstop inline-flex items-center rounded-full border border-crimson/45 bg-crimson/10 px-3 py-1 uppercase text-amber"
                              data-home-hard-stop-eyebrow=""
                            >
                              {hardStopParts.lead}
                              {hardStopParts.accent ? (
                                <span className="text-crimson">{hardStopParts.accent}</span>
                              ) : null}
                            </p>
                            {holdSentence ? (
                              <p
                                className="type-fold-hold text-amber"
                                data-home-hard-stop-hold=""
                              >
                                {holdSentence}
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
                        <div className="shrink-0 self-center sm:self-start" data-home-readiness-gauge="">
                          <HomeScoreGauge scorePct={scorePct} hardStopActive={hardStopActive} />
                        </div>
                      ) : null}
                    </div>
                  </section>

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
